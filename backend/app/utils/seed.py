import os

from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.user import User, Role
from app.models.control import Control, Safeguard
from app.models.settings import Setting
from app.core.logging import logger
from app.utils.cis_ig_map import get_safeguard_ig

CIS_CONTROLS = [
    {
        "cis_id": "1",
        "name": "Inventory and Control of Enterprise Assets",
        "objective": "Actively manage (inventory, track, and correct) all enterprise assets (end-user devices, including portable and mobile; network devices; non-computing/IoT devices; and servers) connected to the infrastructure physically, virtually, remotely, and those within cloud environments, to accurately know the totality of assets that need to be monitored and protected within the enterprise. This will also support identifying unauthorized and unmanaged assets to remove or remediate.",
        "risk_level": "critical",
        "safeguards": [
            {"safeguard_id": "1.1", "title": "Establish and Maintain Detailed Enterprise Asset Inventory", "description": "Establish and maintain an accurate, detailed, and up-to-date inventory of all enterprise assets with the potential to store or process data, to include: end-user devices (including portable and mobile), network devices, non-computing/IoT devices, and servers. Ensure the inventory records the network address, hardware address, machine name, data asset owner, and department for each asset and whether the asset has been approved to connect to the network. Review and update the inventory of all enterprise assets bi-annually, or more frequently."},
            {"safeguard_id": "1.2", "title": "Address Unauthorized Assets", "description": "Ensure that unauthorized assets are either removed from the network, quarantined, or the inventory is updated in a timely manner."},
            {"safeguard_id": "1.3", "title": "Utilize an Active Discovery Tool", "description": "Utilize an active discovery tool to identify assets connected to the enterprise's network. Configure the active discovery tool to execute daily, or more frequently."},
            {"safeguard_id": "1.4", "title": "Use Dynamic Host Configuration Protocol (DHCP) Logging to Update Asset Inventory", "description": "Use DHCP logging to update the enterprise's asset inventory. Review and update the inventory mapping monthly, or more frequently."},
            {"safeguard_id": "1.5", "title": "Use a Passive Asset Discovery Tool", "description": "Use a passive discovery tool to identify assets connected to the enterprise's network. Review and update the inventory of assets bi-annually, or more frequently."},
        ],
    },
    {
        "cis_id": "2",
        "name": "Inventory and Control of Software Assets",
        "objective": "Actively manage (inventory, track, and correct) all software (operating systems and applications) on the network so that only authorized software is installed and can execute, and that unauthorized and unmanaged software is found and prevented from installation or execution.",
        "risk_level": "critical",
        "safeguards": [
            {"safeguard_id": "2.1", "title": "Establish and Maintain a Software Inventory", "description": "Establish and maintain a detailed inventory of all licensed software installed on enterprise assets. The software inventory must document the title, publisher, initial install/use date, and business purpose for each installation; define the business cases allowed for installing any software; and identify the asset location and/or user for each installation. Review and update the software inventory bi-annually, or more frequently."},
            {"safeguard_id": "2.2", "title": "Ensure Authorized Software is Currently Supported", "description": "Ensure that only currently supported software is designated as authorized in the software inventory for enterprise assets. If software is unsupported, yet necessary for the fulfillment of the enterprise's mission, document an exception detailing mitigating controls and a plan for replacement within 180 days. Review the software list to verify software support at least monthly, or more frequently."},
            {"safeguard_id": "2.3", "title": "Address Unauthorized Software", "description": "Ensure that unauthorized software is either removed from use on enterprise assets or receives a documented exception. Review monthly, or more frequently."},
            {"safeguard_id": "2.4", "title": "Utilize Automated Software Inventory Tools", "description": "Utilize software inventory tools, when possible, throughout the enterprise to automate the documentation of installed software on enterprise assets."},
            {"safeguard_id": "2.5", "title": "Allowlist Authorized Software", "description": "Use technical controls, such as application allowlisting, to ensure that only authorized software can execute or be accessed. Reassess bi-annually, or more frequently."},
            {"safeguard_id": "2.6", "title": "Allowlist Authorized Libraries", "description": "Use technical controls to ensure that only authorized software libraries, such as specific .dll, .ocx, .so, etc., files, are allowed to load into a system process. Block unauthorized libraries from loading into a system process. Reassess bi-annually, or more frequently."},
            {"safeguard_id": "2.7", "title": "Allowlist Authorized Scripts", "description": "Use technical controls, such as digital signatures and version control, to ensure that only authorized scripts, such as specific .ps1, .py, etc., files, are allowed to execute. Block unauthorized scripts from executing. Reassess bi-annually, or more frequently."},
        ],
    },
    {
        "cis_id": "3",
        "name": "Data Protection",
        "objective": "Develop processes and technical controls to identify, classify, securely handle, retain, and dispose of data.",
        "risk_level": "high",
        "safeguards": [
            {"safeguard_id": "3.1", "title": "Establish and Maintain a Data Management Process", "description": "Establish and maintain a data management process. In the process, address data sensitivity, data owner, handling of data, data retention limits, and disposal requirements, based on sensitivity and retention standards for the enterprise. Review and update the process annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "3.2", "title": "Establish and Maintain a Data Inventory", "description": "Establish and maintain a data inventory, based on the enterprise's data management process. Inventory sensitive data, at a minimum. Review and update the inventory annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "3.3", "title": "Configure Data Access Control Lists", "description": "Configure access control lists based on a user's need to know and ensure that access is set to deny by default. Review and update access control lists quarterly, or more frequently."},
            {"safeguard_id": "3.4", "title": "Enforce Data Retention", "description": "Retain data according to the enterprise's data management process. Data retention must be outlined and follow compliance and regulatory requirements."},
            {"safeguard_id": "3.5", "title": "Securely Dispose of Data", "description": "Securely dispose of data as outlined in the enterprise's data management process, but at least annually. Ensure the disposal process and method are commensurate with the data sensitivity."},
            {"safeguard_id": "3.6", "title": "Encrypt Data on End-User Devices", "description": "Encrypt data on end-user devices containing sensitive data. Example implementations can include: Windows BitLocker®, Apple FileVault®, Linux® dm-crypt."},
            {"safeguard_id": "3.7", "title": "Establish and Maintain a Data Classification Scheme", "description": "Establish and maintain an overall data classification scheme for the enterprise. Examples of data classification categories include: top secret, secret, confidential, sensitive, and public. Review and update the classification scheme annually, or when significant enterprise changes occur."},
            {"safeguard_id": "3.8", "title": "Document Data Flows", "description": "Document data flows. Data flow documentation includes service provider data flows and should be based on the enterprise's data management process. Review and update documentation annually, or when significant enterprise changes occur."},
            {"safeguard_id": "3.9", "title": "Encrypt Data on Removable Media", "description": "Encrypt data on removable media."},
            {"safeguard_id": "3.10", "title": "Encrypt Sensitive Data in Transit", "description": "Encrypt sensitive data in transit. Example implementations include: Transport Layer Security (TLS) and Open Secure Shell (OpenSSH)."},
            {"safeguard_id": "3.11", "title": "Encrypt Sensitive Data at Rest", "description": "Encrypt sensitive data at rest on servers, applications, and databases containing sensitive data. Storage-layer encryption, also known as server-side encryption, meets the minimum requirement of this Safeguard. Additional application-layer encryption of data can provide additional defense-in-depth."},
            {"safeguard_id": "3.12", "title": "Segment Data Processing and Storage Based on Sensitivity", "description": "Segment data processing and storage based on the sensitivity of the data. Do not process sensitive data on enterprise assets intended for lower sensitivity data."},
            {"safeguard_id": "3.13", "title": "Deploy a Data Loss Prevention Solution", "description": "Deploy a data loss prevention (DLP) solution on enterprise assets that monitor, detect, and block sensitive data exfiltration."},
            {"safeguard_id": "3.14", "title": "Log Sensitive Data Access", "description": "Log access to sensitive data. Example implementations include monitoring access to sensitive data on enterprise assets, and, for some enterprises, comprehensive logging on storage systems with sensitive data."},
        ],
    },
    {
        "cis_id": "4",
        "name": "Secure Configuration of Enterprise Assets and Software",
        "objective": "Establish and maintain the secure configuration of enterprise assets (end-user devices, including portable and mobile; network devices; non-computing/IoT devices; and servers) and software (operating systems and applications).",
        "risk_level": "high",
        "safeguards": [
            {"safeguard_id": "4.1", "title": "Establish and Maintain a Secure Configuration Process", "description": "Establish and maintain a secure configuration process for enterprise assets (end-user devices, including portable and mobile; non-computing/IoT devices; and servers) and software (operating systems and applications). Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "4.2", "title": "Establish and Maintain a Secure Configuration Process for Network Infrastructure", "description": "Establish and maintain a secure configuration process for network devices. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "4.3", "title": "Configure Automatic Session Locking on Enterprise Assets", "description": "Configure automatic session locking on enterprise assets after a defined period of inactivity. For general purpose operating systems, the period must not exceed 15 minutes. For mobile end-user devices, the period must not exceed 2 minutes. For specific enterprise use cases, an approved exception can be defined, but the period must still not exceed the defined period in CIS Control 4.3."},
            {"safeguard_id": "4.4", "title": "Implement and Manage a Firewall on Servers", "description": "Implement and manage a host-based firewall or port-filtering tool on all servers, with a default-deny rule that drops all traffic except those services and ports that are explicitly allowed."},
            {"safeguard_id": "4.5", "title": "Implement and Manage a Firewall on End-User Devices", "description": "Implement and manage a host-based firewall or port-filtering tool on end-user devices, with a default-deny rule that drops all traffic except those services and ports that are explicitly allowed."},
            {"safeguard_id": "4.6", "title": "Securely Manage Enterprise Assets and Software", "description": "Securely manage enterprise assets and software. Example implementations include: restricting administrative privileges to a dedicated administrative account; using a separate password for the administrative account; and requiring multi-factor authentication for the administrative account."},
            {"safeguard_id": "4.7", "title": "Manage Default Accounts on Enterprise Assets and Software", "description": "Manage default accounts on enterprise assets and software, such as root, administrator, and other pre-configured vendor accounts. Example implementations can include: disabling default accounts or making them unusable."},
            {"safeguard_id": "4.8", "title": "Uninstall or Disable Unnecessary Services on Enterprise Assets and Software", "description": "Uninstall or disable unnecessary services on enterprise assets and software, such as an unused file sharing service, web application module, or service function."},
            {"safeguard_id": "4.9", "title": "Configure Trusted DNS Servers on Enterprise Assets", "description": "Configure enterprise assets to use trusted DNS servers. Example implementations include: protecting assets from DNS hijacking by configuring trusted DNS servers and monitoring for changes."},
        ],
    },
    {
        "cis_id": "5",
        "name": "Account Management",
        "objective": "Use processes and tools to assign and manage authorization to credentials for user accounts, including administrator accounts, as well as service accounts, to enterprise assets and software.",
        "risk_level": "high",
        "safeguards": [
            {"safeguard_id": "5.1", "title": "Establish and Maintain an Inventory of Accounts", "description": "Establish and maintain an inventory of all accounts managed in the enterprise. The inventory, at a minimum, must contain the person's name, username, the department for the account, and the date the account was granted access. Review and update the inventory of all accounts to confirm that all active accounts are authorized, on a routine, defined schedule, at least quarterly, or more frequently."},
            {"safeguard_id": "5.2", "title": "Use Unique Passwords", "description": "Use unique passwords for all enterprise assets. Best practice implementation includes, at a minimum, an 8-character password for accounts using multi-factor authentication (MFA) and a 14-character password for accounts not using MFA."},
            {"safeguard_id": "5.3", "title": "Disable Dormant Accounts", "description": "Delete or disable any dormant accounts after a period of 45 days of inactivity, where supported. Disable any dormant accounts that cannot be deleted."},
            {"safeguard_id": "5.4", "title": "Restrict Administrator Privileges to Dedicated Administrator Accounts", "description": "Restrict administrator privileges to dedicated administrator accounts on enterprise assets. Conduct general computing activities, such as internet browsing, email, and productivity suite use, from the user's primary, non-privileged account."},
            {"safeguard_id": "5.5", "title": "Establish and Maintain an Inventory of Service Accounts", "description": "Establish and maintain an inventory of service accounts. The inventory, at a minimum, must contain the department owner, review date, and purpose. Perform service account reviews to validate that all active accounts are authorized, on a recurring schedule at least quarterly, or more frequently."},
            {"safeguard_id": "5.6", "title": "Centralize Account Management", "description": "Centralize account management through a directory service or SSO provider, where supported."},
        ],
    },
    {
        "cis_id": "6",
        "name": "Access Control Management",
        "objective": "Establish processes and tools to create, assign, manage, and revoke access credentials and privileges for user, administrator, and service accounts for enterprise assets and software.",
        "risk_level": "high",
        "safeguards": [
            {"safeguard_id": "6.1", "title": "Establish an Access Granting Process", "description": "Establish and follow a process, preferably automated, for granting access to enterprise assets upon new hire, rights grant, or role change of a user."},
            {"safeguard_id": "6.2", "title": "Establish an Access Revoking Process", "description": "Establish and follow a process, preferably automated, for revoking access to enterprise assets, upon termination, rights revocation, or role change of a user."},
            {"safeguard_id": "6.3", "title": "Require MFA for Externally-Exposed Applications", "description": "Require all externally-exposed enterprise or third-party applications to enforce MFA, where supported. Enforcing MFA through a directory service or SSO provider qualifies as implementing this safeguard."},
            {"safeguard_id": "6.4", "title": "Require MFA for Remote Network Access", "description": "Require MFA for remote access to the enterprise's network, where supported."},
            {"safeguard_id": "6.5", "title": "Require MFA for Administrative Access", "description": "Require MFA for all administrative access accounts, where supported, on all enterprise assets and software, managed and on-premises, regardless of whether the asset or software is accessed remotely or locally."},
            {"safeguard_id": "6.6", "title": "Establish and Maintain an Inventory of Authentication and Authorization Systems", "description": "Establish and maintain an inventory of the enterprise's authentication and authorization systems, including those hosted on-site or by a third-party provider. Review and update the inventory annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "6.7", "title": "Centralize Access Control", "description": "Centralize access control for all enterprise assets through a directory service or SSO provider, where supported."},
            {"safeguard_id": "6.8", "title": "Define and Maintain Role-Based Access Control", "description": "Define and maintain role-based access control, through determining and documenting the access rights necessary for each role within the enterprise to effectively carry out its assigned duties. Perform access control reviews of enterprise assets to validate that all privileges are authorized, on a recurring schedule at least quarterly, or more frequently."},
        ],
    },
    {
        "cis_id": "7",
        "name": "Continuous Vulnerability Management",
        "objective": "Develop a plan to continuously assess and track vulnerabilities on all enterprise assets within the enterprise's infrastructure, in order to remediate, and minimize, the window of opportunity for attackers. Monitor public and private industry sources for new vulnerability information.",
        "risk_level": "high",
        "safeguards": [
            {"safeguard_id": "7.1", "title": "Establish and Maintain a Vulnerability Management Process", "description": "Establish and maintain a documented vulnerability management process for enterprise assets. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "7.2", "title": "Establish and Maintain a Remediation Process", "description": "Establish and maintain a risk-based remediation strategy documented in a remediation process, with monthly, or more frequent, reviews."},
            {"safeguard_id": "7.3", "title": "Perform Automated Operating System Patch Management", "description": "Perform operating system updates on enterprise assets through automated patch management on a monthly, or more frequent, basis."},
            {"safeguard_id": "7.4", "title": "Perform Automated Application Patch Management", "description": "Perform application updates on enterprise assets through automated patch management on a monthly, or more frequent, basis."},
            {"safeguard_id": "7.5", "title": "Perform Automated Vulnerability Scans of Internal Enterprise Assets", "description": "Perform automated vulnerability scans of internal enterprise assets on a quarterly, or more frequent, basis. Conduct both authenticated and unauthenticated scans."},
            {"safeguard_id": "7.6", "title": "Perform Automated Vulnerability Scans of Externally-Exposed Enterprise Assets", "description": "Perform automated vulnerability scans of externally-exposed enterprise assets on a quarterly, or more frequent, basis. Conduct both authenticated and unauthenticated scans."},
            {"safeguard_id": "7.7", "title": "Remediate Detected Vulnerabilities", "description": "Remediate detected vulnerabilities in software through processes on a monthly, or more frequent, basis, based on the remediation process."},
        ],
    },
    {
        "cis_id": "8",
        "name": "Audit Log Management",
        "objective": "Collect, alert, review, and retain audit logs of events that could help detect, understand, or recover from an attack.",
        "risk_level": "medium",
        "safeguards": [
            {"safeguard_id": "8.1", "title": "Establish and Maintain an Audit Log Management Process", "description": "Establish and maintain an audit log management process that defines the enterprise's logging requirements. At a minimum, address the types of logs to be retained, resources to allocate, and the log retention time frame. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "8.2", "title": "Collect Audit Logs", "description": "Collect audit logs. Ensure that logging, per the enterprise's audit log management process, has been enabled and is configured per enterprise requirements."},
            {"safeguard_id": "8.3", "title": "Ensure Adequate Audit Log Storage", "description": "Ensure that the storage capacity for the enterprise's audit logs is large enough to retain audit logs per the enterprise's audit log management process."},
            {"safeguard_id": "8.4", "title": "Standardize Time Synchronization", "description": "Standardize time synchronization. Configure enterprise assets to use time synchronization. At a minimum, enterprise assets should be configured to use the enterprise's time synchronization infrastructure."},
            {"safeguard_id": "8.5", "title": "Collect Detailed Audit Logs", "description": "Configure detailed audit logging for enterprise assets containing sensitive data. Include event source, date, username, timestamp, source addresses, destination addresses, and other useful elements that could assist in a forensic investigation."},
            {"safeguard_id": "8.6", "title": "Collect DNS Query Audit Logs", "description": "Collect DNS query audit logs. Configure the logging to include the source IP address, destination IP address, and query name."},
            {"safeguard_id": "8.7", "title": "Collect URL Request Audit Logs", "description": "Collect URL request audit logs on enterprise assets, where appropriate and supported, to include source IP, destination IP, destination port, and timestamp."},
            {"safeguard_id": "8.8", "title": "Collect Command-Line Audit Logs", "description": "Collect command-line audit logs. Example implementations include collecting audit logs from PowerShell®, Bash®, and cmd.exe."},
            {"safeguard_id": "8.9", "title": "Centralize Audit Logs", "description": "Centralize, to the extent possible, audit log collection and retention across enterprise assets."},
            {"safeguard_id": "8.10", "title": "Retain Audit Logs", "description": "Retain audit logs across enterprise assets for a minimum of 90 days."},
            {"safeguard_id": "8.11", "title": "Conduct Audit Log Reviews", "description": "Conduct reviews of audit logs to detect anomalies or abnormal events that could indicate a potential threat. Conduct reviews on a weekly, or more frequent, basis. If possible, utilize automation."},
            {"safeguard_id": "8.12", "title": "Collect Service Provider Logs", "description": "Collect service provider logs, where supported, to maintain visibility over service provider actions on enterprise assets."},
        ],
    },
    {
        "cis_id": "9",
        "name": "Email and Web Browser Protections",
        "objective": "Improve protections and detections via greater security controls of the enterprise's email and web infrastructure.",
        "risk_level": "medium",
        "safeguards": [
            {"safeguard_id": "9.1", "title": "Ensure Use of Only Fully Supported Browsers and Email Clients", "description": "Ensure only fully supported browsers and email clients are allowed to execute in the enterprise, only using the latest version of browsers and email clients provided through the vendor."},
            {"safeguard_id": "9.2", "title": "Use DNS Filtering Services", "description": "Use DNS filtering services on all enterprise assets to block access to known malicious domains."},
            {"safeguard_id": "9.3", "title": "Maintain and Enforce Network-Based URL Filters", "description": "Enforce and update network-based URL filters to limit an enterprise asset from connecting to potentially malicious or unapproved websites. Example implementations include category-based filtering, reputation-based filtering, or through the use of block lists. Enforce filters for all enterprise assets."},
            {"safeguard_id": "9.4", "title": "Restrict Unnecessary or Unauthorized Browser and Email Client Extensions", "description": "Restrict installation of unnecessary or unauthorized browser or email client extensions, add-ins, or plug-ins."},
            {"safeguard_id": "9.5", "title": "Implement DMARC", "description": "Implement Domain-based Message Authentication, Reporting, and Conformance (DMARC) and enable receiver-side reporting. At a minimum, implement a DMARC policy of p=none. As DMARC matures, progress to a DMARC policy of quarantine and eventually reject."},
            {"safeguard_id": "9.6", "title": "Block Unnecessary File Types", "description": "Block unnecessary file types attempting to enter the enterprise's email gateway."},
            {"safeguard_id": "9.7", "title": "Deploy and Maintain Email Server Anti-Malware Protections", "description": "Deploy and maintain anti-malware software on all email servers."},
        ],
    },
    {
        "cis_id": "10",
        "name": "Malware Defenses",
        "objective": "Prevent or control the installation, spread, and execution of malicious applications, code, or scripts on enterprise assets.",
        "risk_level": "high",
        "safeguards": [
            {"safeguard_id": "10.1", "title": "Deploy and Maintain Anti-Malware Software", "description": "Deploy and maintain anti-malware software on all enterprise assets."},
            {"safeguard_id": "10.2", "title": "Configure Automatic Anti-Malware Signature Updates", "description": "Configure automatic updates for anti-malware signature files on all enterprise assets."},
            {"safeguard_id": "10.3", "title": "Disable Autorun and Autoplay for Removable Media", "description": "Disable autorun and autoplay auto-execute capabilities for removable media."},
            {"safeguard_id": "10.4", "title": "Configure Automatic Anti-Malware Scanning of Removable Media", "description": "Configure anti-malware software to automatically scan removable media upon connection."},
            {"safeguard_id": "10.5", "title": "Enable Anti-Exploitation Features", "description": "Enable anti-exploitation features, such as Data Execution Prevention (DEP), Address Space Layout Randomization (ASLR), virtualization/containerization, etc."},
            {"safeguard_id": "10.6", "title": "Centrally Manage Anti-Malware Software", "description": "Centrally manage anti-malware software."},
            {"safeguard_id": "10.7", "title": "Use Behavior-Based Anti-Malware Software", "description": "Use behavior-based anti-malware software."},
        ],
    },
    {
        "cis_id": "11",
        "name": "Data Recovery",
        "objective": "Establish and maintain data recovery practices sufficient to restore in-scope enterprise assets to a pre-incident and trusted state.",
        "risk_level": "medium",
        "safeguards": [
            {"safeguard_id": "11.1", "title": "Establish and Maintain a Data Recovery Process", "description": "Establish and maintain a data recovery process. In the process, address the scope of data recovery activities, recovery prioritization, and the security of backup data. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "11.2", "title": "Perform Automated Backups", "description": "Perform automated backups of in-scope enterprise assets. Run backups weekly, or more frequently. Recover data, at a minimum, quarterly, by conducting data restoration processes to verify backup integrity."},
            {"safeguard_id": "11.3", "title": "Protect Recovery Data", "description": "Protect recovery data with equivalent controls to the original data. Apply access controls, encryption, and isolation to backup data."},
            {"safeguard_id": "11.4", "title": "Establish and Maintain an Isolated Instance of Recovery Data", "description": "Establish and maintain an isolated instance of recovery data. Example implementations include, version controlling backup data through cloud solutions or air-gapping local backup instances."},
            {"safeguard_id": "11.5", "title": "Test Data Recovery", "description": "Test data recovery quarterly, or more frequently, from backup data."},
        ],
    },
    {
        "cis_id": "12",
        "name": "Network Infrastructure Management",
        "objective": "Establish, implement, and actively manage (track, report on, correct) network devices, in order to prevent attackers from exploiting vulnerable network services and access points.",
        "risk_level": "medium",
        "safeguards": [
            {"safeguard_id": "12.1", "title": "Ensure Network Infrastructure is Up-to-Date", "description": "Ensure network infrastructure is kept up-to-date. Example implementations include running the latest stable release of software and/or currently supported by the vendor."},
            {"safeguard_id": "12.2", "title": "Establish and Maintain a Secure Network Architecture", "description": "Establish and maintain a secure network architecture. A secure network architecture must address segmentation, least privilege, and availability, at a minimum."},
            {"safeguard_id": "12.3", "title": "Securely Manage Network Infrastructure", "description": "Securely manage network infrastructure. Example implementations include the use of secure protocols such as HTTPS and SSH, and multi-factor authentication for administrative access."},
            {"safeguard_id": "12.4", "title": "Establish and Maintain Architecture Diagram(s)", "description": "Establish and maintain architecture diagram(s) and/or other network system documentation. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "12.5", "title": "Centralize Network Authentication, Authorization, and Auditing (AAA)", "description": "Centralize network AAA."},
            {"safeguard_id": "12.6", "title": "Use of Secure Network Management and Communication Protocols", "description": "Use secure network management and communication protocols. Use secure protocols such as SSH and HTTPS for the management and administration of network infrastructure. Disable unnecessary or insecure protocols."},
            {"safeguard_id": "12.7", "title": "Ensure Remote Devices Utilize a VPN and Are Connecting to an Enterprise's AAA Infrastructure", "description": "Require users to authenticate to enterprise-managed VPN and authentication services prior to accessing enterprise resources on end-user devices."},
            {"safeguard_id": "12.8", "title": "Establish and Maintain Dedicated Computing Resources for All Administrative Work", "description": "Establish and maintain dedicated computing resources, either physically or logically separated, for all administrative tasks or tasks requiring administrative access. The enterprise must only use these dedicated computing resources for any task requiring administrative access."},
        ],
    },
    {
        "cis_id": "13",
        "name": "Network Monitoring and Defense",
        "objective": "Operate processes and tooling to establish and maintain comprehensive network monitoring and defense against security threats across the enterprise's network infrastructure and user base.",
        "risk_level": "medium",
        "safeguards": [
            {"safeguard_id": "13.1", "title": "Centralize Security Event Alerting", "description": "Centralize security event alerting. Enterprise detection, prevention, and alerting systems must be integrated to provide a single point of view for all enterprise alerting."},
            {"safeguard_id": "13.2", "title": "Deploy a Host-Based Intrusion Detection Solution", "description": "Deploy a host-based intrusion detection solution on enterprise assets, where appropriate and/or supported."},
            {"safeguard_id": "13.3", "title": "Deploy a Network Intrusion Detection Solution", "description": "Deploy a network intrusion detection solution on enterprise assets, where appropriate. Example implementations include the use of a Network Intrusion Detection System (NIDS) or equivalent cloud service provider (CSP) solution."},
            {"safeguard_id": "13.4", "title": "Perform Traffic Filtering Between Network Segments", "description": "Perform traffic filtering between network segments, where appropriate."},
            {"safeguard_id": "13.5", "title": "Manage Access Control for Remote Assets", "description": "Manage access control for assets remotely connecting to enterprise resources. Determine and document the enterprise's access requirements for all remote assets. Example implementations include: using a separate administrative account for remote access and limiting which users can connect remotely."},
            {"safeguard_id": "13.6", "title": "Collect Network Traffic Flow Logs", "description": "Collect network traffic flow logs and/or network traffic to assist in the investigation of abnormal network activity."},
            {"safeguard_id": "13.7", "title": "Deploy a Host-Based Intrusion Prevention Solution", "description": "Deploy a host-based intrusion prevention solution on enterprise assets, where appropriate and/or supported. Example implementations include the use of Endpoint Detection and Response (EDR) solutions."},
            {"safeguard_id": "13.8", "title": "Deploy a Network Intrusion Prevention Solution", "description": "Deploy a network intrusion prevention solution, where appropriate. Example implementations include the use of a Network Intrusion Prevention System (NIPS) or equivalent CSP solution."},
            {"safeguard_id": "13.9", "title": "Deploy Port-Level Access Control", "description": "Deploy port-level access control, where appropriate. Port-level access control can be implemented via 802.1x, or equivalent technologies."},
            {"safeguard_id": "13.10", "title": "Perform Application Layer Filtering", "description": "Perform application layer filtering. Example implementations include the use of Proxies or Web Application Firewalls (WAF)."},
            {"safeguard_id": "13.11", "title": "Tune Security Event Alerting Thresholds", "description": "Tune security event alerting thresholds, on a monthly, or more frequent, basis."},
        ],
    },
    {
        "cis_id": "14",
        "name": "Security Awareness and Skills Training",
        "objective": "Establish and maintain a security awareness program to influence behavior among the workforce to be security conscious and properly skilled to reduce cybersecurity risks to the enterprise.",
        "risk_level": "low",
        "safeguards": [
            {"safeguard_id": "14.1", "title": "Establish and Maintain a Security Awareness Program", "description": "Establish and maintain a security awareness program. The purpose of a security awareness program is to educate the enterprise's workforce on how to interact with enterprise assets and data in a secure manner. Conduct training at hire and, at a minimum, annually. Review and update content annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "14.2", "title": "Train Workforce Members to Recognize Social Engineering Attacks", "description": "Train workforce members to recognize social engineering attacks, such as phishing, pre-texting, and tailgating."},
            {"safeguard_id": "14.3", "title": "Train Workforce Members on Authentication Best Practices", "description": "Train workforce members on authentication best practices. Example topics include MFA, password composition, and credential management."},
            {"safeguard_id": "14.4", "title": "Train Workforce on Data Handling Best Practices", "description": "Train workforce members on how to identify and properly store, transfer, archive, or destroy sensitive information."},
            {"safeguard_id": "14.5", "title": "Train Workforce Members on Causes of Unintentional Data Exposure", "description": "Train workforce members to be aware of causes for unintentional data exposures. Example topics include the risk of emailing clear text passwords or sensitive data as an attachment, or the risk of not locking their computer when they step away."},
            {"safeguard_id": "14.6", "title": "Train Workforce Members on Recognizing and Reporting Security Incidents", "description": "Train workforce members to be able to recognize a potential incident and be able to report such an incident."},
            {"safeguard_id": "14.7", "title": "Train Workforce on How to Identify and Report if Their Enterprise Assets are Missing Security Updates", "description": "Train workforce members on how to identify and report if their enterprise assets are missing security updates, have antivirus signatures that are out-of-date, or have not been recently scanned."},
            {"safeguard_id": "14.8", "title": "Train Workforce on the Dangers of Connecting to and Transmitting Enterprise Data Over Insecure Networks", "description": "Train workforce members on the dangers of connecting to, and transmitting data over, insecure networks (e.g., public Wi-Fi). In addition, train workforce members on the procedures to ensure that the remote connections and data transmissions are performed in a secure manner."},
            {"safeguard_id": "14.9", "title": "Conduct Role-Specific Security Awareness and Skills Training", "description": "Conduct role-specific security awareness and skills training. Example implementations include secure application development training for software engineers, or training for incident response teams."},
        ],
    },
    {
        "cis_id": "15",
        "name": "Service Provider Management",
        "objective": "Develop a process to evaluate service providers who hold sensitive data, or are responsible for an enterprise's critical IT platforms or processes, to ensure these providers are protecting those platforms and data appropriately.",
        "risk_level": "medium",
        "safeguards": [
            {"safeguard_id": "15.1", "title": "Establish and Maintain an Inventory of Service Providers", "description": "Establish and maintain an inventory of service providers. The inventory must record the service provided, the type of service, and the contact. Review and update the inventory annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "15.2", "title": "Establish and Maintain a Service Provider Management Policy", "description": "Establish and maintain a service provider management policy. Ensure the policy requires service providers to undergo a security assessment, and that contractual language is in place to ensure the right to audit. Review and update the policy annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "15.3", "title": "Classify Service Providers", "description": "Classify service providers. Classification consideration must include one or more characteristics, such as data sensitivity, criticality of the service, or access to the enterprise's network. Review and update classifications annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "15.4", "title": "Ensure Service Provider Contracts Include Security Requirements", "description": "Ensure service provider contracts include security requirements, such as a right-to-audit clause, to address access, handling, and ownership of enterprise's data."},
            {"safeguard_id": "15.5", "title": "Assess Service Providers", "description": "Assess service providers annually to ensure they are meeting their contractual obligations. Review the results and document any issues in a deviation request."},
            {"safeguard_id": "15.6", "title": "Monitor Service Provider Security Practices", "description": "Monitor service provider security practices on a recurring basis to ensure security controls are implemented and operating as intended."},
            {"safeguard_id": "15.7", "title": "Securely Decommission Service Providers", "description": "Securely decommission service providers. Example implementations include ensuring that data and enterprise assets are returned or destroyed in a secure manner."},
            {"safeguard_id": "15.8", "title": "Establish and Maintain Service Provider Data Transmission Policy", "description": "Establish and maintain a service provider data transmission policy. The policy must include requirements for encryption and data integrity, and it must address access to enterprise data. Review and update the policy annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "15.9", "title": "Establish and Maintain Service Provider Asset Policy", "description": "Establish and maintain a service provider asset policy. The policy must identify whether the service provider or the enterprise owns the asset, the asset's location, and the return or destruction process. Review and update the policy annually, or when significant enterprise changes occur that could impact this Safeguard."},
        ],
    },
    {
        "cis_id": "16",
        "name": "Application Software Security",
        "objective": "Manage the security life cycle of in-house developed, hosted, or acquired software to prevent, detect, and remediate security weaknesses before they can impact the enterprise.",
        "risk_level": "high",
        "safeguards": [
            {"safeguard_id": "16.1", "title": "Establish and Maintain a Secure Application Development Process", "description": "Establish and maintain a secure application development process. In the process, address such items as: secure application design standards, secure coding practices, developer training, vulnerability management, code review, and application security testing. Review and update the process at least annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "16.2", "title": "Establish and Maintain a Process to Accept and Address Software Vulnerabilities", "description": "Establish and maintain a process to accept and address reports of software vulnerabilities, including reports from the public. As part of the process, designate a point of contact for the public to submit vulnerability reports."},
            {"safeguard_id": "16.3", "title": "Perform Root Cause Analysis on Security Vulnerabilities", "description": "Perform root cause analysis on security vulnerabilities. When possible, address the root cause of the vulnerability and not the symptom."},
            {"safeguard_id": "16.4", "title": "Establish and Manage an Inventory of Third-Party Software Components", "description": "Establish and manage an updated inventory of third-party components used in development, often called a 'Software Bill of Materials' (SBOM), as well as components embedded in enterprise software. Review and update the inventory annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "16.5", "title": "Use Up-to-Date and Trusted Third-Party Software Components", "description": "Use up-to-date and trusted third-party software components. Use software components from trusted repositories. When using such repositories, validate the legitimacy of components prior to use."},
            {"safeguard_id": "16.6", "title": "Establish and Maintain a Severity Rating System and Process for Application Vulnerabilities", "description": "Establish and maintain a severity rating system and process for application vulnerabilities that facilitates the prioritization of order-of-remediation based on the impact to the business. Review and update the system and process annually."},
            {"safeguard_id": "16.7", "title": "Use Standard Hardening Configuration Templates for Application Infrastructure", "description": "Use standard hardening configuration templates for application infrastructure. Implement via the use of Infrastructure as Code (IaC)."},
            {"safeguard_id": "16.8", "title": "Separate Production and Non-Production Systems", "description": "Maintain separate environments for production and non-production systems."},
            {"safeguard_id": "16.9", "title": "Train Developers in Application Security Concepts and Secure Coding", "description": "Train developers in application security concepts and secure coding. Conduct training at hire and annually. Review and update training annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "16.10", "title": "Apply Secure Design Principles in Application Architectures", "description": "Apply secure design principles in application architectures. Secure design principles include the concept of least privilege and enforcing mediation to validate every operation that the user makes, prioritizing fail-safe defaults, and minimizing attack surface area."},
            {"safeguard_id": "16.11", "title": "Leverage Vetted Modules or Services for Application Security Components", "description": "Leverage vetted modules or services for application security components, such as user authentication, access control, and encryption."},
            {"safeguard_id": "16.12", "title": "Implement Code-Level Security Checks", "description": "Implement code-level security checks. Example implementations include static application security testing (SAST), dynamic application security testing (DAST), and software composition analysis (SCA)."},
            {"safeguard_id": "16.13", "title": "Conduct Application Penetration Testing", "description": "Conduct application penetration testing. For critical applications, authenticated penetration testing is better suited to finding business logic vulnerabilities than code scanning and automated security testing."},
            {"safeguard_id": "16.14", "title": "Conduct Threat Modeling", "description": "Conduct threat modeling. Threat modeling is a form of risk assessment that models aspects of the attack and defense sides of a logical entity, such as a piece of data, an application, a component, a function, or a service."},
        ],
    },
    {
        "cis_id": "17",
        "name": "Incident Response Management",
        "objective": "Establish a program to develop and maintain an incident response capability (e.g., policies, plans, procedures, defined roles, training, and communications) to prepare, detect, and quickly respond to an attack.",
        "risk_level": "high",
        "safeguards": [
            {"safeguard_id": "17.1", "title": "Designate Personnel to Manage Incident Handling", "description": "Designate one key person, and at least one backup, who will manage the enterprise's incident handling process. Management personnel are responsible for the oversight of all components of incident handling, including but not limited to: containment and eradication, and risk assessment, and are to be contacted in the event of an incident."},
            {"safeguard_id": "17.2", "title": "Establish and Maintain Contact Information for Reporting Security Incidents", "description": "Establish and maintain contact information for parties that need to be informed of security incidents. Contacts may include internal staff and external entities, such as: service providers, vendors, and law enforcement. Review and update contacts annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "17.3", "title": "Establish and Maintain an Enterprise Process for Reporting Incidents", "description": "Establish and maintain an enterprise process for the workforce to report security incidents. The process must include workforce members reporting sensitive data spills, lost/stolen portable end-user devices and paper files, potential malware infections, and any other security incidents. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "17.4", "title": "Establish and Maintain an Incident Response Process", "description": "Establish and maintain an incident response process that addresses roles and responsibilities, compliance requirements, and communication plans. Example implementations can be based on established frameworks (e.g., NIST SP 800-61r2). Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "17.5", "title": "Assign Key Roles and Responsibilities for Incident Response", "description": "Assign key roles and responsibilities for incident response, including but not limited to: containment, eradication, and recovery. Assign roles and responsibilities so that all personnel involved in incident response know what is expected of them."},
            {"safeguard_id": "17.6", "title": "Define Mechanisms for Communicating During Incident Response", "description": "Define mechanisms for communicating during incident response. Example implementations include: establishing out-of-band communication channels and having the capability to preserve communications."},
            {"safeguard_id": "17.7", "title": "Conduct Routine Incident Response Tabletop Exercises", "description": "Conduct routine incident response tabletop exercises. Exercises must be conducted at a routine frequency, at least annually, and involve personnel that have a role in the incident response process."},
            {"safeguard_id": "17.8", "title": "Conduct Post-Incident Reviews", "description": "Conduct post-incident reviews. Reviews must include identifying the root cause and the steps to prevent the incident from happening again."},
            {"safeguard_id": "17.9", "title": "Establish and Maintain Security Incident Thresholds", "description": "Establish and maintain security incident thresholds. Example implementations include establishing a severity rating for incidents, and establishing a process for prioritizing incidents based on the severity rating."},
        ],
    },
    {
        "cis_id": "18",
        "name": "Penetration Testing",
        "objective": "Test the effectiveness and resiliency of enterprise assets through identifying and exploiting weaknesses in controls (people, processes, and technology), and simulating the objectives and actions of an attacker.",
        "risk_level": "medium",
        "safeguards": [
            {"safeguard_id": "18.1", "title": "Establish and Maintain a Penetration Testing Program", "description": "Establish and maintain a penetration testing program appropriate to the size, complexity, and maturity of the enterprise. Penetration testing program characteristics include scope, such as network, web application, Application Programming Interface (API), hosted services, and physical premise controls; frequency; limitations, such as acceptable hours, and excluded attack types; point of contact information; remediation, such as how findings will be routed; and retrospective requirements. Review and update the penetration testing program annually, or when significant enterprise changes occur that could impact this Safeguard."},
            {"safeguard_id": "18.2", "title": "Perform Periodic Internal Penetration Tests", "description": "Perform periodic internal penetration tests based on program requirements, no less than bi-annually. The testing may be black box or white box as needed."},
            {"safeguard_id": "18.3", "title": "Remediate Penetration Test Findings", "description": "Remediate penetration test findings. It is important to prioritize and implement the appropriate remediation based on the enterprise's risk tolerance and the risk rating of the finding."},
            {"safeguard_id": "18.4", "title": "Validate Security Measures", "description": "Validate security measures after the remediation of penetration test findings."},
            {"safeguard_id": "18.5", "title": "Perform Periodic External Penetration Tests", "description": "Perform periodic external penetration tests based on program requirements, no less than bi-annually. External penetration testing must include enterprise and environmental reconnaissance to detect exploitable information. Penetration testing requires specialized skills and experience and must be conducted through a qualified party. The testing may be black box or white box as needed."},
        ],
    },
]

DEFAULT_ROLES = [
    {
        "name": "Admin",
        "description": "Full platform access, user management, settings",
        "permissions": ["*"],
    },
    {
        "name": "Security Analyst",
        "description": "Manage controls, evidence, assignments",
        "permissions": [
            "controls:read", "controls:write",
            "evidence:read", "evidence:write",
            "comments:read", "comments:write",
            "dashboard:read", "reports:read", "reports:write",
        ],
    },
    {
        "name": "Auditor",
        "description": "Read-only + audit log access, can add comments",
        "permissions": [
            "controls:read",
            "evidence:read",
            "comments:read", "comments:write",
            "audit_logs:read",
            "dashboard:read", "reports:read",
        ],
    },
    {
        "name": "Viewer",
        "description": "Read-only dashboard and controls list",
        "permissions": [
            "controls:read",
            "evidence:read",
            "comments:read",
            "dashboard:read", "reports:read",
        ],
    },
]

DEFAULT_USERS = [
    {
        "email": "admin@csat.local",  # ship-safe-ignore: demo seed data
        "password": "Admin123!",  # ship-safe-ignore: demo seed data
        "full_name": "System Administrator",
        "roles": ["Admin"],
    },
    {
        "email": "analyst@csat.local",  # ship-safe-ignore: demo seed data
        "password": "Analyst123!",  # ship-safe-ignore: demo seed data
        "full_name": "Security Analyst",
        "roles": ["Security Analyst"],
    },
    {
        "email": "auditor@csat.local",  # ship-safe-ignore: demo seed data
        "password": "Auditor123!",  # ship-safe-ignore: demo seed data
        "full_name": "Compliance Auditor",
        "roles": ["Auditor"],
    },
    {
        "email": "viewer@csat.local",  # ship-safe-ignore: demo seed data
        "password": "Viewer123!",  # ship-safe-ignore: demo seed data
        "full_name": "Read-Only Viewer",
        "roles": ["Viewer"],
    },
]


def seed_database(db: Session):
    # Seed roles
    existing_roles = {r.name for r in db.query(Role).all()}
    for role_data in DEFAULT_ROLES:
        if role_data["name"] not in existing_roles:
            role = Role(
                name=role_data["name"],
                description=role_data["description"],
                permissions=role_data["permissions"],
            )
            db.add(role)
    db.commit()

    # Seed users
    existing_users = {u.email for u in db.query(User).all()}
    for user_data in DEFAULT_USERS:
        if user_data["email"] not in existing_users:
            user = User(
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                is_active=True,
            )
            db.add(user)
            db.flush()
            for role_name in user_data["roles"]:
                role = db.query(Role).filter(Role.name == role_name).first()
                if role:
                    user.roles.append(role)
    db.commit()

    # Seed controls
    existing_controls = {c.cis_id for c in db.query(Control).all()}
    for ctrl_data in CIS_CONTROLS:
        if ctrl_data["cis_id"] not in existing_controls:
            control = Control(
                cis_id=ctrl_data["cis_id"],
                name=ctrl_data["name"],
                objective=ctrl_data["objective"],
                risk_level=ctrl_data.get("risk_level", "medium"),
            )
            db.add(control)
            db.flush()
            for sg_data in ctrl_data.get("safeguards", []):
                sg = Safeguard(
                    control_id=control.id,
                    safeguard_id=sg_data["safeguard_id"],
                    title=sg_data["title"],
                    description=sg_data.get("description"),
                    ig=get_safeguard_ig(sg_data["safeguard_id"]),
                )
                db.add(sg)
    db.commit()

    # Update IG for existing safeguards (migration path)
    for sg in db.query(Safeguard).all():
        correct_ig = get_safeguard_ig(sg.safeguard_id)
        if sg.ig != correct_ig:
            sg.ig = correct_ig
    db.commit()

    # Seed default settings
    existing_settings = {s.key for s in db.query(Setting).all()}
    defaults = {
        "platform_name": "CSAT",
        "theme_default": "dark",
        "review_reminder_days": 7,
        "mfa_required_for_admin": False,
        "language": "en",
        "ai_config": {
            "provider": "ollama",
            "api_url": os.environ.get("AI_DEFAULT_URL", "http://localhost:11434"),
            "api_key": "",
            "model": os.environ.get("AI_DEFAULT_MODEL", "llama3.2:3b"),
        },
    }
    for key, value in defaults.items():
        if key not in existing_settings:
            db.add(Setting(key=key, value=value))
    db.commit()

    logger.info("database_seeded")
