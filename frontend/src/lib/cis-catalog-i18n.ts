// CIS Controls v8 catalog translations.
// Source data (English) lives in backend/app/utils/seed.py and is served from the DB.
// This module provides ES / PT overlays so the UI can render the catalog in the
// user's language without touching the backend. Falls back to the DB value
// when a translation is missing or the language is "en".

import type { Control, Safeguard } from "../types";
import type { Language } from "./i18n";

interface ControlText {
  name: string;
  objective: string;
}

interface SafeguardText {
  title: string;
  description: string;
}

/* ============================================================
 * Spanish (neutral, common to LATAM)
 * ============================================================ */

const ES_CONTROLS: Record<string, ControlText> = {
  "1": {
    name: "Inventario y control de activos de la empresa",
    objective:
      "Gestionar activamente (inventariar, rastrear y corregir) todos los activos de la empresa (dispositivos de usuario final, incluidos portátiles y móviles; dispositivos de red; dispositivos no informáticos/IoT; y servidores) conectados a la infraestructura física, virtual y remotamente, así como los que están en entornos en la nube, para conocer con precisión el total de activos a monitorear y proteger. Esto también permite identificar activos no autorizados o no gestionados para removerlos o remediarlos.",
  },
  "2": {
    name: "Inventario y control de activos de software",
    objective:
      "Gestionar activamente (inventariar, rastrear y corregir) todo el software (sistemas operativos y aplicaciones) en la red, de modo que solo el software autorizado esté instalado y pueda ejecutarse, y que el software no autorizado o no gestionado sea detectado y se impida su instalación o ejecución.",
  },
  "3": {
    name: "Protección de datos",
    objective:
      "Desarrollar procesos y controles técnicos para identificar, clasificar, manejar de forma segura, retener y disponer de los datos.",
  },
  "4": {
    name: "Configuración segura de activos y software de la empresa",
    objective:
      "Establecer y mantener la configuración segura de los activos de la empresa (dispositivos de usuario final, incluidos portátiles y móviles; dispositivos de red; dispositivos no informáticos/IoT; y servidores) y del software (sistemas operativos y aplicaciones).",
  },
  "5": {
    name: "Gestión de cuentas",
    objective:
      "Usar procesos y herramientas para asignar y gestionar la autorización de credenciales de cuentas de usuario, incluidas cuentas de administrador, así como cuentas de servicio, sobre los activos y software de la empresa.",
  },
  "6": {
    name: "Gestión de control de acceso",
    objective:
      "Establecer procesos y herramientas para crear, asignar, gestionar y revocar credenciales y privilegios de acceso para cuentas de usuario, administrador y servicio sobre los activos y software de la empresa.",
  },
  "7": {
    name: "Gestión continua de vulnerabilidades",
    objective:
      "Desarrollar un plan para evaluar y rastrear continuamente las vulnerabilidades en todos los activos de la empresa, con el fin de remediarlas y minimizar la ventana de oportunidad para los atacantes. Monitorear fuentes públicas y privadas de la industria para obtener nueva información sobre vulnerabilidades.",
  },
  "8": {
    name: "Gestión de registros de auditoría",
    objective:
      "Recolectar, alertar, revisar y retener registros de auditoría de eventos que puedan ayudar a detectar, comprender o recuperarse de un ataque.",
  },
  "9": {
    name: "Protecciones de correo electrónico y navegador web",
    objective:
      "Mejorar las protecciones y detecciones mediante mayores controles de seguridad sobre la infraestructura de correo electrónico y web de la empresa.",
  },
  "10": {
    name: "Defensas contra malware",
    objective:
      "Prevenir o controlar la instalación, propagación y ejecución de aplicaciones, código o scripts maliciosos en los activos de la empresa.",
  },
  "11": {
    name: "Recuperación de datos",
    objective:
      "Establecer y mantener prácticas de recuperación de datos suficientes para restaurar los activos de la empresa dentro del alcance a un estado previo al incidente y de confianza.",
  },
  "12": {
    name: "Gestión de la infraestructura de red",
    objective:
      "Establecer, implementar y gestionar activamente (rastrear, reportar y corregir) los dispositivos de red, para impedir que los atacantes exploten servicios de red vulnerables y puntos de acceso.",
  },
  "13": {
    name: "Monitoreo y defensa de la red",
    objective:
      "Operar procesos y herramientas para establecer y mantener un monitoreo y defensa integrales de la red contra amenazas de seguridad en toda la infraestructura de red y la base de usuarios de la empresa.",
  },
  "14": {
    name: "Concienciación y entrenamiento en seguridad",
    objective:
      "Establecer y mantener un programa de concienciación en seguridad para influir en el comportamiento del personal, de modo que sea consciente de la seguridad y esté debidamente capacitado para reducir los riesgos de ciberseguridad de la empresa.",
  },
  "15": {
    name: "Gestión de proveedores de servicios",
    objective:
      "Desarrollar un proceso para evaluar a los proveedores de servicios que manejan datos sensibles o son responsables de plataformas o procesos críticos de TI de la empresa, para asegurar que protegen adecuadamente esas plataformas y datos.",
  },
  "16": {
    name: "Seguridad del software de aplicación",
    objective:
      "Gestionar el ciclo de vida de seguridad del software desarrollado internamente, alojado o adquirido para prevenir, detectar y remediar debilidades de seguridad antes de que impacten en la empresa.",
  },
  "17": {
    name: "Gestión de respuesta a incidentes",
    objective:
      "Establecer un programa para desarrollar y mantener una capacidad de respuesta a incidentes (políticas, planes, procedimientos, roles definidos, entrenamiento y comunicaciones) que permita preparar, detectar y responder rápidamente a un ataque.",
  },
  "18": {
    name: "Pruebas de penetración",
    objective:
      "Probar la efectividad y resiliencia de los activos de la empresa mediante la identificación y explotación de debilidades en los controles (personas, procesos y tecnología), simulando los objetivos y acciones de un atacante.",
  },
};

const ES_SAFEGUARDS: Record<string, SafeguardText> = {
  // Control 1
  "1.1": {
    title: "Establecer y mantener un inventario detallado de activos de la empresa",
    description:
      "Establecer y mantener un inventario preciso, detallado y actualizado de todos los activos de la empresa con potencial de almacenar o procesar datos, incluyendo: dispositivos de usuario final (portátiles y móviles), dispositivos de red, dispositivos no informáticos/IoT y servidores. Asegurar que el inventario registre la dirección de red, dirección de hardware, nombre de máquina, dueño del activo de datos y departamento de cada activo, y si el activo está aprobado para conectarse a la red. Revisar y actualizar el inventario semestralmente, o con mayor frecuencia.",
  },
  "1.2": {
    title: "Atender activos no autorizados",
    description:
      "Asegurar que los activos no autorizados sean removidos de la red, puestos en cuarentena, o que el inventario sea actualizado oportunamente.",
  },
  "1.3": {
    title: "Utilizar una herramienta de descubrimiento activo",
    description:
      "Utilizar una herramienta de descubrimiento activo para identificar los activos conectados a la red de la empresa. Configurar la herramienta para ejecutarse diariamente o con mayor frecuencia.",
  },
  "1.4": {
    title: "Usar el registro DHCP para actualizar el inventario de activos",
    description:
      "Usar el registro de DHCP para actualizar el inventario de activos de la empresa. Revisar y actualizar el mapeo del inventario mensualmente o con mayor frecuencia.",
  },
  "1.5": {
    title: "Usar una herramienta de descubrimiento pasivo de activos",
    description:
      "Usar una herramienta de descubrimiento pasivo para identificar los activos conectados a la red. Revisar y actualizar el inventario semestralmente o con mayor frecuencia.",
  },

  // Control 2
  "2.1": {
    title: "Establecer y mantener un inventario de software",
    description:
      "Establecer y mantener un inventario detallado de todo el software con licencia instalado en los activos de la empresa. El inventario debe documentar título, fabricante, fecha inicial de instalación/uso y propósito de negocio para cada instalación; definir los casos de negocio permitidos para instalar software; e identificar la ubicación del activo y/o usuario para cada instalación. Revisar y actualizar el inventario semestralmente o con mayor frecuencia.",
  },
  "2.2": {
    title: "Asegurar que el software autorizado esté soportado",
    description:
      "Asegurar que solo el software actualmente soportado se designe como autorizado en el inventario. Si el software no está soportado pero es necesario para cumplir la misión de la empresa, documentar una excepción detallando controles compensatorios y un plan de reemplazo dentro de 180 días. Revisar la lista de software al menos mensualmente o con mayor frecuencia.",
  },
  "2.3": {
    title: "Atender software no autorizado",
    description:
      "Asegurar que el software no autorizado sea removido de los activos de la empresa o reciba una excepción documentada. Revisar mensualmente o con mayor frecuencia.",
  },
  "2.4": {
    title: "Utilizar herramientas automatizadas de inventario de software",
    description:
      "Utilizar herramientas de inventario de software, cuando sea posible, en toda la empresa para automatizar la documentación del software instalado en los activos.",
  },
  "2.5": {
    title: "Permitir solo software autorizado (allowlist)",
    description:
      "Usar controles técnicos, como listas de permitidos (allowlisting), para asegurar que solo el software autorizado pueda ejecutarse o ser accedido. Revaluar semestralmente o con mayor frecuencia.",
  },
  "2.6": {
    title: "Permitir solo bibliotecas autorizadas (allowlist)",
    description:
      "Usar controles técnicos para asegurar que solo las bibliotecas de software autorizadas, como archivos .dll, .ocx, .so, etc., puedan cargarse en un proceso del sistema. Bloquear las bibliotecas no autorizadas. Revaluar semestralmente o con mayor frecuencia.",
  },
  "2.7": {
    title: "Permitir solo scripts autorizados (allowlist)",
    description:
      "Usar controles técnicos, como firmas digitales y control de versiones, para asegurar que solo los scripts autorizados (por ejemplo, .ps1, .py) puedan ejecutarse. Bloquear scripts no autorizados. Revaluar semestralmente o con mayor frecuencia.",
  },

  // Control 3
  "3.1": {
    title: "Establecer y mantener un proceso de gestión de datos",
    description:
      "Establecer y mantener un proceso de gestión de datos. En el proceso, abordar la sensibilidad de los datos, dueño de los datos, manejo, límites de retención y requisitos de eliminación, según los estándares de sensibilidad y retención de la empresa. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "3.2": {
    title: "Establecer y mantener un inventario de datos",
    description:
      "Establecer y mantener un inventario de datos basado en el proceso de gestión de datos de la empresa. Inventariar como mínimo los datos sensibles. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "3.3": {
    title: "Configurar listas de control de acceso a datos",
    description:
      "Configurar listas de control de acceso basadas en la necesidad de saber del usuario y asegurar que el acceso esté denegado por defecto. Revisar y actualizar las listas trimestralmente o con mayor frecuencia.",
  },
  "3.4": {
    title: "Aplicar la retención de datos",
    description:
      "Retener los datos según el proceso de gestión de datos de la empresa. La retención debe estar definida y cumplir requisitos regulatorios y de compliance.",
  },
  "3.5": {
    title: "Eliminar datos de forma segura",
    description:
      "Eliminar de forma segura los datos según el proceso de gestión de datos de la empresa, al menos anualmente. Asegurar que el método de eliminación sea proporcional a la sensibilidad de los datos.",
  },
  "3.6": {
    title: "Cifrar datos en dispositivos de usuario final",
    description:
      "Cifrar los datos en dispositivos de usuario final que contengan datos sensibles. Ejemplos de implementación: Windows BitLocker®, Apple FileVault®, Linux® dm-crypt.",
  },
  "3.7": {
    title: "Establecer y mantener un esquema de clasificación de datos",
    description:
      "Establecer y mantener un esquema general de clasificación de datos. Categorías de ejemplo: top secret, secreto, confidencial, sensible y público. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "3.8": {
    title: "Documentar los flujos de datos",
    description:
      "Documentar los flujos de datos. La documentación incluye los flujos hacia/desde proveedores de servicios y debe basarse en el proceso de gestión de datos. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "3.9": {
    title: "Cifrar datos en medios removibles",
    description: "Cifrar los datos almacenados en medios removibles.",
  },
  "3.10": {
    title: "Cifrar datos sensibles en tránsito",
    description:
      "Cifrar los datos sensibles en tránsito. Ejemplos: Transport Layer Security (TLS) y Open Secure Shell (OpenSSH).",
  },
  "3.11": {
    title: "Cifrar datos sensibles en reposo",
    description:
      "Cifrar los datos sensibles en reposo en servidores, aplicaciones y bases de datos. El cifrado a nivel de almacenamiento (server-side) cumple el requisito mínimo. El cifrado adicional a nivel de aplicación brinda defensa en profundidad.",
  },
  "3.12": {
    title: "Segmentar el procesamiento y almacenamiento de datos por sensibilidad",
    description:
      "Segmentar el procesamiento y almacenamiento de datos según la sensibilidad. No procesar datos sensibles en activos destinados a datos de menor sensibilidad.",
  },
  "3.13": {
    title: "Desplegar una solución de prevención de pérdida de datos (DLP)",
    description:
      "Desplegar una solución de prevención de pérdida de datos (DLP) en los activos de la empresa que monitoree, detecte y bloquee la exfiltración de datos sensibles.",
  },
  "3.14": {
    title: "Registrar el acceso a datos sensibles",
    description:
      "Registrar el acceso a datos sensibles. Ejemplos: monitorear el acceso a datos sensibles en activos de la empresa y, en algunos casos, aplicar logging integral en sistemas de almacenamiento con datos sensibles.",
  },

  // Control 4
  "4.1": {
    title: "Establecer y mantener un proceso de configuración segura",
    description:
      "Establecer y mantener un proceso de configuración segura para los activos de la empresa (dispositivos de usuario final, incluidos portátiles y móviles; dispositivos no informáticos/IoT; y servidores) y software (sistemas operativos y aplicaciones). Revisar y actualizar la documentación anualmente, o cuando ocurran cambios significativos.",
  },
  "4.2": {
    title: "Establecer y mantener un proceso de configuración segura para la infraestructura de red",
    description:
      "Establecer y mantener un proceso de configuración segura para los dispositivos de red. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "4.3": {
    title: "Configurar bloqueo automático de sesión en activos de la empresa",
    description:
      "Configurar el bloqueo automático de sesión en los activos de la empresa luego de un período definido de inactividad. En sistemas operativos de propósito general, el período no debe superar 15 minutos. En dispositivos móviles de usuario final, el período no debe superar 2 minutos. Para casos específicos puede definirse una excepción aprobada, sin superar el período definido en CIS Control 4.3.",
  },
  "4.4": {
    title: "Implementar y gestionar un firewall en servidores",
    description:
      "Implementar y gestionar un firewall basado en host o herramienta de filtrado de puertos en todos los servidores, con regla por defecto de denegar todo el tráfico salvo los servicios y puertos explícitamente permitidos.",
  },
  "4.5": {
    title: "Implementar y gestionar un firewall en dispositivos de usuario final",
    description:
      "Implementar y gestionar un firewall basado en host o herramienta de filtrado de puertos en dispositivos de usuario final, con regla por defecto de denegar todo el tráfico salvo los servicios y puertos explícitamente permitidos.",
  },
  "4.6": {
    title: "Gestionar de forma segura los activos y software de la empresa",
    description:
      "Gestionar de forma segura los activos y software. Ejemplos: restringir privilegios administrativos a una cuenta administrativa dedicada; usar una contraseña separada para esa cuenta; y exigir autenticación multifactor para la cuenta administrativa.",
  },
  "4.7": {
    title: "Gestionar cuentas por defecto en activos y software",
    description:
      "Gestionar las cuentas por defecto en activos y software, como root, administrador y otras cuentas preconfiguradas por proveedores. Ejemplos: deshabilitar las cuentas por defecto o dejarlas inutilizables.",
  },
  "4.8": {
    title: "Desinstalar o deshabilitar servicios innecesarios",
    description:
      "Desinstalar o deshabilitar servicios innecesarios en activos y software, como servicios de compartición de archivos no usados, módulos de aplicaciones web o funciones de servicio.",
  },
  "4.9": {
    title: "Configurar servidores DNS de confianza en los activos",
    description:
      "Configurar los activos para usar servidores DNS de confianza. Ejemplos: proteger los activos contra el secuestro de DNS configurando servidores DNS confiables y monitoreando cambios.",
  },

  // Control 5
  "5.1": {
    title: "Establecer y mantener un inventario de cuentas",
    description:
      "Establecer y mantener un inventario de todas las cuentas gestionadas en la empresa. El inventario debe contener al menos el nombre de la persona, nombre de usuario, departamento y la fecha en que se concedió el acceso. Revisar y actualizar el inventario al menos trimestralmente o con mayor frecuencia para confirmar que todas las cuentas activas estén autorizadas.",
  },
  "5.2": {
    title: "Usar contraseñas únicas",
    description:
      "Usar contraseñas únicas en todos los activos de la empresa. La buena práctica incluye, como mínimo, contraseñas de 8 caracteres para cuentas con MFA y de 14 caracteres para cuentas sin MFA.",
  },
  "5.3": {
    title: "Deshabilitar cuentas inactivas",
    description:
      "Eliminar o deshabilitar cualquier cuenta inactiva luego de 45 días de inactividad, donde sea soportado. Deshabilitar las cuentas inactivas que no puedan eliminarse.",
  },
  "5.4": {
    title: "Restringir privilegios de administrador a cuentas dedicadas",
    description:
      "Restringir los privilegios administrativos a cuentas dedicadas. Realizar actividades generales (navegación web, correo, ofimática) desde la cuenta primaria sin privilegios del usuario.",
  },
  "5.5": {
    title: "Establecer y mantener un inventario de cuentas de servicio",
    description:
      "Establecer y mantener un inventario de cuentas de servicio. El inventario debe contener al menos el departamento dueño, fecha de revisión y propósito. Realizar revisiones trimestrales o más frecuentes para validar que todas las cuentas activas estén autorizadas.",
  },
  "5.6": {
    title: "Centralizar la gestión de cuentas",
    description:
      "Centralizar la gestión de cuentas a través de un servicio de directorio o proveedor SSO, donde sea soportado.",
  },

  // Control 6
  "6.1": {
    title: "Establecer un proceso de otorgamiento de acceso",
    description:
      "Establecer y seguir un proceso, preferentemente automatizado, para otorgar acceso a los activos de la empresa al ingresar un nuevo empleado, otorgar derechos o cambiar de rol.",
  },
  "6.2": {
    title: "Establecer un proceso de revocación de acceso",
    description:
      "Establecer y seguir un proceso, preferentemente automatizado, para revocar el acceso a los activos de la empresa al cesar a un empleado, revocar derechos o cambiar de rol.",
  },
  "6.3": {
    title: "Exigir MFA para aplicaciones expuestas externamente",
    description:
      "Exigir MFA en todas las aplicaciones expuestas externamente, propias o de terceros, donde sea soportado. Imponer MFA mediante un servicio de directorio o proveedor SSO califica como cumplimiento.",
  },
  "6.4": {
    title: "Exigir MFA para acceso remoto a la red",
    description:
      "Exigir MFA para el acceso remoto a la red de la empresa, donde sea soportado.",
  },
  "6.5": {
    title: "Exigir MFA para acceso administrativo",
    description:
      "Exigir MFA en todas las cuentas con acceso administrativo, donde sea soportado, en todos los activos y software, gestionados o on-premises, sin importar si el activo se accede de forma remota o local.",
  },
  "6.6": {
    title: "Establecer y mantener un inventario de sistemas de autenticación y autorización",
    description:
      "Establecer y mantener un inventario de los sistemas de autenticación y autorización de la empresa, incluidos los hospedados en sitio o por terceros. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "6.7": {
    title: "Centralizar el control de acceso",
    description:
      "Centralizar el control de acceso a todos los activos de la empresa mediante un servicio de directorio o proveedor SSO, donde sea soportado.",
  },
  "6.8": {
    title: "Definir y mantener control de acceso basado en roles",
    description:
      "Definir y mantener control de acceso basado en roles, determinando y documentando los derechos de acceso necesarios para cada rol dentro de la empresa para cumplir con sus tareas asignadas. Realizar revisiones trimestrales o más frecuentes para validar que todos los privilegios estén autorizados.",
  },

  // Control 7
  "7.1": {
    title: "Establecer y mantener un proceso de gestión de vulnerabilidades",
    description:
      "Establecer y mantener un proceso documentado de gestión de vulnerabilidades para los activos de la empresa. Revisar y actualizar la documentación anualmente, o cuando ocurran cambios significativos.",
  },
  "7.2": {
    title: "Establecer y mantener un proceso de remediación",
    description:
      "Establecer y mantener una estrategia de remediación basada en riesgo, documentada en un proceso de remediación, con revisiones mensuales o más frecuentes.",
  },
  "7.3": {
    title: "Aplicar gestión automatizada de parches del sistema operativo",
    description:
      "Aplicar actualizaciones del sistema operativo en los activos mediante gestión automatizada de parches, mensualmente o con mayor frecuencia.",
  },
  "7.4": {
    title: "Aplicar gestión automatizada de parches de aplicaciones",
    description:
      "Aplicar actualizaciones de aplicaciones en los activos mediante gestión automatizada de parches, mensualmente o con mayor frecuencia.",
  },
  "7.5": {
    title: "Realizar escaneos automatizados de vulnerabilidades en activos internos",
    description:
      "Realizar escaneos automatizados de vulnerabilidades en activos internos de la empresa trimestralmente o con mayor frecuencia. Realizar escaneos autenticados y no autenticados.",
  },
  "7.6": {
    title: "Realizar escaneos automatizados de vulnerabilidades en activos expuestos externamente",
    description:
      "Realizar escaneos automatizados de vulnerabilidades en activos expuestos externamente trimestralmente o con mayor frecuencia. Realizar escaneos autenticados y no autenticados.",
  },
  "7.7": {
    title: "Remediar las vulnerabilidades detectadas",
    description:
      "Remediar las vulnerabilidades detectadas en el software mediante procesos mensuales o más frecuentes, según el proceso de remediación.",
  },

  // Control 8
  "8.1": {
    title: "Establecer y mantener un proceso de gestión de registros de auditoría",
    description:
      "Establecer y mantener un proceso de gestión de registros de auditoría que defina los requisitos de logging de la empresa. Como mínimo, abordar los tipos de logs a retener, los recursos a asignar y la ventana de retención. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "8.2": {
    title: "Recolectar registros de auditoría",
    description:
      "Recolectar registros de auditoría. Asegurar que el logging, según el proceso de gestión, esté habilitado y configurado conforme a los requisitos de la empresa.",
  },
  "8.3": {
    title: "Asegurar capacidad de almacenamiento adecuada para registros de auditoría",
    description:
      "Asegurar que la capacidad de almacenamiento de registros de auditoría sea suficiente para retenerlos según el proceso de gestión de la empresa.",
  },
  "8.4": {
    title: "Estandarizar la sincronización de tiempo",
    description:
      "Estandarizar la sincronización de tiempo. Configurar los activos de la empresa para usar sincronización de tiempo. Como mínimo, los activos deben usar la infraestructura de sincronización de tiempo de la empresa.",
  },
  "8.5": {
    title: "Recolectar registros de auditoría detallados",
    description:
      "Configurar logging detallado en activos que contengan datos sensibles. Incluir origen del evento, fecha, usuario, marca de tiempo, direcciones origen y destino, y otros elementos útiles para una investigación forense.",
  },
  "8.6": {
    title: "Recolectar registros de consultas DNS",
    description:
      "Recolectar logs de consultas DNS. Configurar el logging para incluir la dirección IP origen, IP destino y el nombre consultado.",
  },
  "8.7": {
    title: "Recolectar registros de solicitudes URL",
    description:
      "Recolectar logs de solicitudes URL en activos de la empresa, donde sea apropiado y soportado, incluyendo IP origen, IP destino, puerto destino y marca de tiempo.",
  },
  "8.8": {
    title: "Recolectar registros de auditoría de línea de comandos",
    description:
      "Recolectar registros de auditoría de línea de comandos. Ejemplos: PowerShell®, Bash® y cmd.exe.",
  },
  "8.9": {
    title: "Centralizar registros de auditoría",
    description:
      "Centralizar, en la medida de lo posible, la recolección y retención de registros de auditoría en todos los activos de la empresa.",
  },
  "8.10": {
    title: "Retener registros de auditoría",
    description: "Retener los registros de auditoría en los activos de la empresa por un mínimo de 90 días.",
  },
  "8.11": {
    title: "Realizar revisiones de registros de auditoría",
    description:
      "Realizar revisiones de registros de auditoría para detectar anomalías o eventos anormales que puedan indicar una amenaza potencial. Realizar revisiones semanales o con mayor frecuencia. Si es posible, automatizar.",
  },
  "8.12": {
    title: "Recolectar registros de proveedores de servicios",
    description:
      "Recolectar logs de los proveedores de servicios, donde sea soportado, para mantener visibilidad sobre las acciones de los proveedores en los activos de la empresa.",
  },

  // Control 9
  "9.1": {
    title: "Asegurar el uso solo de navegadores y clientes de correo soportados",
    description:
      "Asegurar que solo navegadores y clientes de correo totalmente soportados puedan ejecutarse en la empresa, usando únicamente la última versión provista por el proveedor.",
  },
  "9.2": {
    title: "Usar servicios de filtrado DNS",
    description:
      "Usar servicios de filtrado DNS en todos los activos para bloquear el acceso a dominios maliciosos conocidos.",
  },
  "9.3": {
    title: "Mantener y aplicar filtros de URL basados en red",
    description:
      "Aplicar y actualizar filtros de URL basados en red para limitar la conexión de los activos a sitios web potencialmente maliciosos o no aprobados. Ejemplos: filtrado por categoría, por reputación o mediante listas de bloqueo. Aplicar a todos los activos.",
  },
  "9.4": {
    title: "Restringir extensiones innecesarias de navegador y cliente de correo",
    description:
      "Restringir la instalación de extensiones, complementos o plugins innecesarios o no autorizados en navegadores o clientes de correo.",
  },
  "9.5": {
    title: "Implementar DMARC",
    description:
      "Implementar DMARC (Domain-based Message Authentication, Reporting and Conformance) y habilitar reportes del lado del receptor. Como mínimo, implementar política p=none. A medida que DMARC madure, avanzar a quarantine y eventualmente a reject.",
  },
  "9.6": {
    title: "Bloquear tipos de archivo innecesarios",
    description: "Bloquear los tipos de archivo innecesarios que intenten entrar al gateway de correo de la empresa.",
  },
  "9.7": {
    title: "Desplegar y mantener protecciones anti-malware en servidores de correo",
    description: "Desplegar y mantener software anti-malware en todos los servidores de correo.",
  },

  // Control 10
  "10.1": {
    title: "Desplegar y mantener software anti-malware",
    description: "Desplegar y mantener software anti-malware en todos los activos de la empresa.",
  },
  "10.2": {
    title: "Configurar actualizaciones automáticas de firmas anti-malware",
    description: "Configurar actualizaciones automáticas de archivos de firmas anti-malware en todos los activos.",
  },
  "10.3": {
    title: "Deshabilitar autorun y autoplay para medios removibles",
    description: "Deshabilitar las capacidades de auto-ejecución (autorun y autoplay) para medios removibles.",
  },
  "10.4": {
    title: "Configurar escaneo automático de medios removibles",
    description: "Configurar el software anti-malware para escanear automáticamente los medios removibles al conectarlos.",
  },
  "10.5": {
    title: "Habilitar funciones anti-explotación",
    description:
      "Habilitar funciones anti-explotación, como Data Execution Prevention (DEP), Address Space Layout Randomization (ASLR), virtualización/contenedores, etc.",
  },
  "10.6": {
    title: "Gestionar centralmente el software anti-malware",
    description: "Gestionar centralmente el software anti-malware.",
  },
  "10.7": {
    title: "Usar software anti-malware basado en comportamiento",
    description: "Usar software anti-malware basado en comportamiento.",
  },

  // Control 11
  "11.1": {
    title: "Establecer y mantener un proceso de recuperación de datos",
    description:
      "Establecer y mantener un proceso de recuperación de datos. Abordar el alcance de las actividades de recuperación, su priorización y la seguridad de los datos de respaldo. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "11.2": {
    title: "Realizar respaldos automatizados",
    description:
      "Realizar respaldos automatizados de los activos dentro del alcance. Ejecutar respaldos semanalmente o con mayor frecuencia. Recuperar datos al menos trimestralmente para verificar la integridad de los respaldos.",
  },
  "11.3": {
    title: "Proteger los datos de recuperación",
    description:
      "Proteger los datos de recuperación con controles equivalentes a los de los datos originales. Aplicar controles de acceso, cifrado y aislamiento a los datos de respaldo.",
  },
  "11.4": {
    title: "Establecer y mantener una instancia aislada de datos de recuperación",
    description:
      "Establecer y mantener una instancia aislada de datos de recuperación. Ejemplos: control de versiones de respaldos en soluciones cloud o air-gapping de instancias locales.",
  },
  "11.5": {
    title: "Probar la recuperación de datos",
    description: "Probar la recuperación de datos trimestralmente o con mayor frecuencia, a partir de los datos de respaldo.",
  },

  // Control 12
  "12.1": {
    title: "Asegurar que la infraestructura de red esté actualizada",
    description:
      "Asegurar que la infraestructura de red se mantenga actualizada. Ejemplos: ejecutar la última versión estable del software y/o aquellas actualmente soportadas por el proveedor.",
  },
  "12.2": {
    title: "Establecer y mantener una arquitectura de red segura",
    description:
      "Establecer y mantener una arquitectura de red segura. Como mínimo, la arquitectura debe abordar segmentación, mínimo privilegio y disponibilidad.",
  },
  "12.3": {
    title: "Gestionar de forma segura la infraestructura de red",
    description:
      "Gestionar de forma segura la infraestructura de red. Ejemplos: uso de protocolos seguros como HTTPS y SSH, y autenticación multifactor para acceso administrativo.",
  },
  "12.4": {
    title: "Establecer y mantener diagramas de arquitectura",
    description:
      "Establecer y mantener diagramas de arquitectura y/u otra documentación del sistema de red. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "12.5": {
    title: "Centralizar autenticación, autorización y auditoría de red (AAA)",
    description: "Centralizar AAA de red.",
  },
  "12.6": {
    title: "Usar protocolos seguros de gestión y comunicación de red",
    description:
      "Usar protocolos seguros de gestión y comunicación de red. Usar protocolos como SSH y HTTPS para la administración de la infraestructura. Deshabilitar protocolos innecesarios o inseguros.",
  },
  "12.7": {
    title: "Asegurar que los dispositivos remotos usen VPN y se conecten al AAA de la empresa",
    description:
      "Exigir a los usuarios autenticarse a la VPN gestionada por la empresa y a los servicios de autenticación antes de acceder a recursos de la empresa desde dispositivos de usuario final.",
  },
  "12.8": {
    title: "Establecer y mantener recursos de cómputo dedicados para tareas administrativas",
    description:
      "Establecer y mantener recursos de cómputo dedicados, separados física o lógicamente, para todas las tareas administrativas o tareas que requieran acceso administrativo. La empresa solo debe usar estos recursos dedicados para tareas que requieran acceso administrativo.",
  },

  // Control 13
  "13.1": {
    title: "Centralizar las alertas de eventos de seguridad",
    description:
      "Centralizar las alertas de eventos de seguridad. Los sistemas de detección, prevención y alertas deben estar integrados para ofrecer una vista única de todas las alertas de la empresa.",
  },
  "13.2": {
    title: "Desplegar una solución de detección de intrusiones basada en host",
    description:
      "Desplegar una solución de detección de intrusiones basada en host (HIDS) en los activos donde sea apropiado y/o soportado.",
  },
  "13.3": {
    title: "Desplegar una solución de detección de intrusiones de red",
    description:
      "Desplegar una solución de detección de intrusiones de red (NIDS) en los activos donde sea apropiado, o equivalentes en proveedores cloud.",
  },
  "13.4": {
    title: "Filtrar tráfico entre segmentos de red",
    description: "Filtrar el tráfico entre segmentos de red, donde sea apropiado.",
  },
  "13.5": {
    title: "Gestionar control de acceso para activos remotos",
    description:
      "Gestionar el control de acceso de los activos que se conectan remotamente a recursos de la empresa. Determinar y documentar los requisitos de acceso para todos los activos remotos. Ejemplos: usar una cuenta administrativa separada para acceso remoto y limitar qué usuarios pueden conectarse remotamente.",
  },
  "13.6": {
    title: "Recolectar logs de flujo de tráfico de red",
    description:
      "Recolectar logs de flujo de tráfico de red y/o tráfico de red para asistir en la investigación de actividad anómala.",
  },
  "13.7": {
    title: "Desplegar una solución de prevención de intrusiones basada en host",
    description:
      "Desplegar una solución de prevención de intrusiones basada en host (HIPS) en los activos donde sea apropiado y/o soportado. Ejemplos: soluciones EDR (Endpoint Detection and Response).",
  },
  "13.8": {
    title: "Desplegar una solución de prevención de intrusiones de red",
    description:
      "Desplegar una solución de prevención de intrusiones de red (NIPS) donde sea apropiado, o equivalentes en proveedores cloud.",
  },
  "13.9": {
    title: "Desplegar control de acceso a nivel de puerto",
    description:
      "Desplegar control de acceso a nivel de puerto, donde sea apropiado. Puede implementarse vía 802.1x o tecnologías equivalentes.",
  },
  "13.10": {
    title: "Realizar filtrado a nivel de aplicación",
    description: "Realizar filtrado a nivel de aplicación. Ejemplos: uso de proxies o WAFs (Web Application Firewalls).",
  },
  "13.11": {
    title: "Ajustar umbrales de alertas de eventos de seguridad",
    description: "Ajustar los umbrales de alertas de eventos de seguridad mensualmente o con mayor frecuencia.",
  },

  // Control 14
  "14.1": {
    title: "Establecer y mantener un programa de concienciación en seguridad",
    description:
      "Establecer y mantener un programa de concienciación en seguridad. El propósito es educar al personal sobre cómo interactuar con los activos y datos de manera segura. Realizar capacitaciones al ingreso y, como mínimo, anualmente. Revisar y actualizar el contenido anualmente, o cuando ocurran cambios significativos.",
  },
  "14.2": {
    title: "Capacitar al personal para reconocer ataques de ingeniería social",
    description:
      "Capacitar al personal para reconocer ataques de ingeniería social, como phishing, pre-texting y tailgating.",
  },
  "14.3": {
    title: "Capacitar al personal en mejores prácticas de autenticación",
    description:
      "Capacitar al personal en mejores prácticas de autenticación. Ejemplos: MFA, composición de contraseñas y gestión de credenciales.",
  },
  "14.4": {
    title: "Capacitar al personal en mejores prácticas de manejo de datos",
    description:
      "Capacitar al personal sobre cómo identificar y almacenar, transferir, archivar o destruir adecuadamente la información sensible.",
  },
  "14.5": {
    title: "Capacitar al personal sobre causas de exposición no intencional de datos",
    description:
      "Capacitar al personal para que sea consciente de las causas de exposiciones no intencionales de datos. Ejemplos: enviar contraseñas en texto claro o datos sensibles como adjunto, o no bloquear la computadora al alejarse.",
  },
  "14.6": {
    title: "Capacitar al personal para reconocer y reportar incidentes de seguridad",
    description: "Capacitar al personal para reconocer un potencial incidente y poder reportarlo.",
  },
  "14.7": {
    title: "Capacitar al personal sobre cómo identificar y reportar activos sin actualizaciones de seguridad",
    description:
      "Capacitar al personal sobre cómo identificar y reportar si sus activos están sin actualizaciones de seguridad, tienen firmas antivirus desactualizadas o no han sido escaneados recientemente.",
  },
  "14.8": {
    title: "Capacitar al personal sobre los peligros de redes inseguras",
    description:
      "Capacitar al personal sobre los peligros de conectarse y transmitir datos por redes inseguras (por ejemplo, Wi-Fi pública). Capacitar también sobre los procedimientos para garantizar conexiones remotas y transmisiones seguras.",
  },
  "14.9": {
    title: "Realizar capacitación de concienciación específica por rol",
    description:
      "Realizar capacitación de concienciación y habilidades específicas por rol. Ejemplos: capacitación en desarrollo seguro para ingenieros de software, o capacitación para equipos de respuesta a incidentes.",
  },

  // Control 15
  "15.1": {
    title: "Establecer y mantener un inventario de proveedores de servicios",
    description:
      "Establecer y mantener un inventario de proveedores de servicios. Debe registrar el servicio prestado, el tipo y el contacto. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "15.2": {
    title: "Establecer y mantener una política de gestión de proveedores de servicios",
    description:
      "Establecer y mantener una política de gestión de proveedores de servicios. La política debe exigir que los proveedores se sometan a una evaluación de seguridad y que el lenguaje contractual contemple el derecho a auditar. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "15.3": {
    title: "Clasificar proveedores de servicios",
    description:
      "Clasificar a los proveedores de servicios. La clasificación debe considerar características como sensibilidad de los datos, criticidad del servicio o acceso a la red de la empresa. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "15.4": {
    title: "Asegurar que los contratos con proveedores incluyan requisitos de seguridad",
    description:
      "Asegurar que los contratos con proveedores incluyan requisitos de seguridad, como cláusulas de derecho a auditar, para abordar el acceso, manejo y propiedad de los datos de la empresa.",
  },
  "15.5": {
    title: "Evaluar a los proveedores de servicios",
    description:
      "Evaluar a los proveedores anualmente para asegurar que cumplen con sus obligaciones contractuales. Revisar los resultados y documentar cualquier desviación.",
  },
  "15.6": {
    title: "Monitorear las prácticas de seguridad de los proveedores",
    description:
      "Monitorear las prácticas de seguridad de los proveedores de forma recurrente para asegurar que los controles de seguridad estén implementados y operando como se espera.",
  },
  "15.7": {
    title: "Dar de baja proveedores de forma segura",
    description:
      "Dar de baja proveedores de servicios de forma segura. Ejemplos: asegurar que los datos y activos sean devueltos o destruidos de forma segura.",
  },
  "15.8": {
    title: "Establecer y mantener una política de transmisión de datos con proveedores",
    description:
      "Establecer y mantener una política de transmisión de datos con proveedores de servicios. Debe incluir requisitos de cifrado e integridad y abordar el acceso a los datos de la empresa. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "15.9": {
    title: "Establecer y mantener una política de activos con proveedores",
    description:
      "Establecer y mantener una política de activos con proveedores de servicios. Debe identificar si el proveedor o la empresa es dueño del activo, su ubicación, y el proceso de devolución o destrucción. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },

  // Control 16
  "16.1": {
    title: "Establecer y mantener un proceso seguro de desarrollo de aplicaciones",
    description:
      "Establecer y mantener un proceso seguro de desarrollo de aplicaciones. Abordar elementos como: estándares de diseño seguro, prácticas de codificación segura, capacitación de desarrolladores, gestión de vulnerabilidades, revisión de código y pruebas de seguridad de aplicaciones. Revisar y actualizar al menos anualmente, o cuando ocurran cambios significativos.",
  },
  "16.2": {
    title: "Establecer un proceso para aceptar y atender vulnerabilidades de software",
    description:
      "Establecer y mantener un proceso para aceptar y atender reportes de vulnerabilidades de software, incluidos los reportes del público. Como parte del proceso, designar un punto de contacto para que el público pueda enviar reportes de vulnerabilidades.",
  },
  "16.3": {
    title: "Realizar análisis de causa raíz en vulnerabilidades de seguridad",
    description:
      "Realizar análisis de causa raíz sobre las vulnerabilidades de seguridad. Cuando sea posible, atender la causa raíz y no solo el síntoma.",
  },
  "16.4": {
    title: "Establecer y gestionar un inventario de componentes de software de terceros",
    description:
      "Establecer y gestionar un inventario actualizado de componentes de terceros usados en desarrollo, frecuentemente llamado SBOM (Software Bill of Materials), así como componentes embebidos en el software de la empresa. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "16.5": {
    title: "Usar componentes de software de terceros actualizados y confiables",
    description:
      "Usar componentes de software de terceros actualizados y confiables. Usar componentes de repositorios confiables. Validar la legitimidad de los componentes antes de usarlos.",
  },
  "16.6": {
    title: "Establecer un sistema de calificación de severidad para vulnerabilidades de aplicaciones",
    description:
      "Establecer y mantener un sistema y proceso de calificación de severidad para vulnerabilidades de aplicaciones que facilite la priorización de la remediación según el impacto en el negocio. Revisar y actualizar anualmente.",
  },
  "16.7": {
    title: "Usar plantillas estándar de hardening para infraestructura de aplicaciones",
    description:
      "Usar plantillas estándar de configuración de hardening para la infraestructura de aplicaciones. Implementar mediante Infrastructure as Code (IaC).",
  },
  "16.8": {
    title: "Separar entornos de producción y no producción",
    description: "Mantener entornos separados para sistemas de producción y no producción.",
  },
  "16.9": {
    title: "Capacitar a los desarrolladores en conceptos de seguridad y codificación segura",
    description:
      "Capacitar a los desarrolladores en conceptos de seguridad de aplicaciones y codificación segura. Realizar capacitación al ingreso y anualmente. Revisar y actualizar la capacitación anualmente, o cuando ocurran cambios significativos.",
  },
  "16.10": {
    title: "Aplicar principios de diseño seguro en arquitecturas de aplicaciones",
    description:
      "Aplicar principios de diseño seguro en arquitecturas de aplicaciones. Incluyen: mínimo privilegio, mediación obligatoria para validar cada operación del usuario, fail-safe defaults y minimización de la superficie de ataque.",
  },
  "16.11": {
    title: "Aprovechar módulos o servicios validados para componentes de seguridad",
    description:
      "Aprovechar módulos o servicios validados para componentes de seguridad de aplicaciones, como autenticación de usuarios, control de acceso y cifrado.",
  },
  "16.12": {
    title: "Implementar verificaciones de seguridad a nivel de código",
    description:
      "Implementar verificaciones de seguridad a nivel de código. Ejemplos: pruebas estáticas (SAST), pruebas dinámicas (DAST) y análisis de composición de software (SCA).",
  },
  "16.13": {
    title: "Realizar pruebas de penetración de aplicaciones",
    description:
      "Realizar pruebas de penetración de aplicaciones. Para aplicaciones críticas, las pruebas autenticadas son más apropiadas para detectar vulnerabilidades de lógica de negocio que el escaneo de código y las pruebas automatizadas.",
  },
  "16.14": {
    title: "Realizar modelado de amenazas",
    description:
      "Realizar modelado de amenazas. Es una forma de evaluación de riesgo que modela aspectos de ataque y defensa de una entidad lógica, como un dato, una aplicación, un componente, una función o un servicio.",
  },

  // Control 17
  "17.1": {
    title: "Designar personal para gestionar el manejo de incidentes",
    description:
      "Designar una persona clave y al menos un suplente que gestionarán el proceso de manejo de incidentes de la empresa. El personal directivo es responsable de la supervisión de todos los componentes del manejo de incidentes, incluyendo contención y erradicación, y evaluación de riesgo, y debe ser contactado en caso de incidente.",
  },
  "17.2": {
    title: "Establecer y mantener información de contacto para reportar incidentes",
    description:
      "Establecer y mantener información de contacto de las partes que deben ser informadas sobre incidentes de seguridad. Los contactos pueden incluir personal interno y entidades externas, como proveedores y autoridades. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "17.3": {
    title: "Establecer y mantener un proceso empresarial para reportar incidentes",
    description:
      "Establecer y mantener un proceso para que el personal reporte incidentes de seguridad. Debe incluir el reporte de fugas de datos sensibles, dispositivos perdidos/robados, archivos en papel, posibles infecciones por malware y cualquier otro incidente de seguridad. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "17.4": {
    title: "Establecer y mantener un proceso de respuesta a incidentes",
    description:
      "Establecer y mantener un proceso de respuesta a incidentes que aborde roles y responsabilidades, requisitos de compliance y planes de comunicación. Ejemplos basados en frameworks como NIST SP 800-61r2. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "17.5": {
    title: "Asignar roles y responsabilidades clave para respuesta a incidentes",
    description:
      "Asignar roles y responsabilidades clave para la respuesta a incidentes, incluyendo contención, erradicación y recuperación. Asignar roles para que todo el personal involucrado sepa qué se espera de él.",
  },
  "17.6": {
    title: "Definir mecanismos de comunicación durante la respuesta a incidentes",
    description:
      "Definir mecanismos de comunicación durante la respuesta a incidentes. Ejemplos: establecer canales de comunicación fuera de banda y la capacidad de preservar las comunicaciones.",
  },
  "17.7": {
    title: "Realizar ejercicios rutinarios de respuesta a incidentes (tabletop)",
    description:
      "Realizar ejercicios rutinarios de respuesta a incidentes (tabletop). Los ejercicios deben hacerse con frecuencia rutinaria, al menos anualmente, e involucrar al personal con rol en el proceso de respuesta.",
  },
  "17.8": {
    title: "Realizar revisiones post-incidente",
    description:
      "Realizar revisiones post-incidente. Deben incluir la identificación de la causa raíz y los pasos para evitar que el incidente vuelva a ocurrir.",
  },
  "17.9": {
    title: "Establecer y mantener umbrales de incidentes de seguridad",
    description:
      "Establecer y mantener umbrales de incidentes de seguridad. Ejemplos: establecer una calificación de severidad para incidentes y un proceso para priorizarlos según la severidad.",
  },

  // Control 18
  "18.1": {
    title: "Establecer y mantener un programa de pruebas de penetración",
    description:
      "Establecer y mantener un programa de pruebas de penetración apropiado al tamaño, complejidad y madurez de la empresa. Debe incluir alcance (red, aplicación web, API, servicios alojados, controles físicos), frecuencia, limitaciones (horarios aceptables, tipos de ataque excluidos), información de contacto, remediación (cómo se enrutarán los hallazgos) y requisitos retrospectivos. Revisar y actualizar anualmente, o cuando ocurran cambios significativos.",
  },
  "18.2": {
    title: "Realizar pruebas de penetración internas periódicas",
    description:
      "Realizar pruebas de penetración internas periódicas según los requisitos del programa, no menos que semestralmente. Las pruebas pueden ser de caja negra o caja blanca según se requiera.",
  },
  "18.3": {
    title: "Remediar hallazgos de pruebas de penetración",
    description:
      "Remediar los hallazgos de las pruebas de penetración. Es importante priorizar e implementar la remediación apropiada según la tolerancia al riesgo de la empresa y la calificación de riesgo del hallazgo.",
  },
  "18.4": {
    title: "Validar las medidas de seguridad",
    description: "Validar las medidas de seguridad luego de la remediación de los hallazgos de pruebas de penetración.",
  },
  "18.5": {
    title: "Realizar pruebas de penetración externas periódicas",
    description:
      "Realizar pruebas de penetración externas periódicas según los requisitos del programa, no menos que semestralmente. Las pruebas externas deben incluir reconocimiento del entorno y de la empresa para detectar información explotable. Las pruebas requieren habilidades y experiencia especializadas y deben ser realizadas por una parte calificada. Las pruebas pueden ser de caja negra o blanca según se requiera.",
  },
};

/* ============================================================
 * Portuguese (Brasil)
 * ============================================================ */

const PT_CONTROLS: Record<string, ControlText> = {
  "1": {
    name: "Inventário e Controle de Ativos da Empresa",
    objective:
      "Gerenciar ativamente (inventariar, rastrear e corrigir) todos os ativos da empresa (dispositivos de usuário final, incluindo portáteis e móveis; dispositivos de rede; dispositivos não-computacionais/IoT; e servidores) conectados à infraestrutura física, virtual e remotamente, e os que estão em ambientes na nuvem, para conhecer com precisão a totalidade dos ativos a serem monitorados e protegidos. Isso também ajuda a identificar ativos não autorizados ou não gerenciados para removê-los ou remediá-los.",
  },
  "2": {
    name: "Inventário e Controle de Ativos de Software",
    objective:
      "Gerenciar ativamente (inventariar, rastrear e corrigir) todo o software (sistemas operacionais e aplicações) na rede, de modo que apenas o software autorizado esteja instalado e possa ser executado, e que software não autorizado ou não gerenciado seja detectado e impedido de ser instalado ou executado.",
  },
  "3": {
    name: "Proteção de Dados",
    objective:
      "Desenvolver processos e controles técnicos para identificar, classificar, manipular com segurança, reter e descartar dados.",
  },
  "4": {
    name: "Configuração Segura de Ativos da Empresa e Software",
    objective:
      "Estabelecer e manter a configuração segura dos ativos da empresa (dispositivos de usuário final, incluindo portáteis e móveis; dispositivos de rede; dispositivos não-computacionais/IoT; e servidores) e do software (sistemas operacionais e aplicações).",
  },
  "5": {
    name: "Gerenciamento de Contas",
    objective:
      "Usar processos e ferramentas para atribuir e gerenciar a autorização de credenciais para contas de usuário, incluindo contas de administrador, bem como contas de serviço, para os ativos e software da empresa.",
  },
  "6": {
    name: "Gerenciamento de Controle de Acesso",
    objective:
      "Estabelecer processos e ferramentas para criar, atribuir, gerenciar e revogar credenciais de acesso e privilégios para contas de usuário, administrador e serviço sobre os ativos e software da empresa.",
  },
  "7": {
    name: "Gerenciamento Contínuo de Vulnerabilidades",
    objective:
      "Desenvolver um plano para avaliar e rastrear continuamente vulnerabilidades em todos os ativos da empresa, a fim de remediar e minimizar a janela de oportunidade para atacantes. Monitorar fontes públicas e privadas da indústria para novas informações de vulnerabilidades.",
  },
  "8": {
    name: "Gerenciamento de Logs de Auditoria",
    objective:
      "Coletar, alertar, revisar e reter logs de auditoria de eventos que possam ajudar a detectar, entender ou recuperar-se de um ataque.",
  },
  "9": {
    name: "Proteção de E-mail e Navegador Web",
    objective:
      "Melhorar as proteções e detecções por meio de maiores controles de segurança sobre a infraestrutura de e-mail e web da empresa.",
  },
  "10": {
    name: "Defesas contra Malware",
    objective:
      "Prevenir ou controlar a instalação, propagação e execução de aplicações, código ou scripts maliciosos nos ativos da empresa.",
  },
  "11": {
    name: "Recuperação de Dados",
    objective:
      "Estabelecer e manter práticas de recuperação de dados suficientes para restaurar os ativos da empresa dentro do escopo a um estado anterior ao incidente e confiável.",
  },
  "12": {
    name: "Gerenciamento de Infraestrutura de Rede",
    objective:
      "Estabelecer, implementar e gerenciar ativamente (rastrear, reportar, corrigir) os dispositivos de rede, a fim de impedir que atacantes explorem serviços de rede vulneráveis e pontos de acesso.",
  },
  "13": {
    name: "Monitoramento e Defesa de Rede",
    objective:
      "Operar processos e ferramentas para estabelecer e manter monitoramento e defesa abrangentes da rede contra ameaças de segurança em toda a infraestrutura de rede e base de usuários da empresa.",
  },
  "14": {
    name: "Conscientização e Treinamento em Segurança",
    objective:
      "Estabelecer e manter um programa de conscientização em segurança para influenciar o comportamento da força de trabalho a ser consciente da segurança e adequadamente capacitada para reduzir os riscos de cibersegurança da empresa.",
  },
  "15": {
    name: "Gerenciamento de Provedores de Serviço",
    objective:
      "Desenvolver um processo para avaliar provedores de serviço que mantêm dados sensíveis ou são responsáveis por plataformas ou processos críticos de TI da empresa, para garantir que esses provedores estão protegendo adequadamente essas plataformas e dados.",
  },
  "16": {
    name: "Segurança do Software de Aplicação",
    objective:
      "Gerenciar o ciclo de vida de segurança do software desenvolvido internamente, hospedado ou adquirido para prevenir, detectar e remediar fragilidades de segurança antes que possam impactar a empresa.",
  },
  "17": {
    name: "Gerenciamento de Resposta a Incidentes",
    objective:
      "Estabelecer um programa para desenvolver e manter uma capacidade de resposta a incidentes (políticas, planos, procedimentos, papéis definidos, treinamento e comunicações) para preparar, detectar e responder rapidamente a um ataque.",
  },
  "18": {
    name: "Testes de Penetração",
    objective:
      "Testar a efetividade e resiliência dos ativos da empresa identificando e explorando fragilidades nos controles (pessoas, processos e tecnologia), e simulando os objetivos e ações de um atacante.",
  },
};

const PT_SAFEGUARDS: Record<string, SafeguardText> = {
  // Control 1
  "1.1": {
    title: "Estabelecer e Manter um Inventário Detalhado de Ativos da Empresa",
    description:
      "Estabelecer e manter um inventário preciso, detalhado e atualizado de todos os ativos da empresa com potencial de armazenar ou processar dados, incluindo: dispositivos de usuário final (portáteis e móveis), dispositivos de rede, dispositivos não-computacionais/IoT e servidores. Garantir que o inventário registre o endereço de rede, endereço de hardware, nome da máquina, dono do ativo de dados e departamento para cada ativo, e se o ativo foi aprovado para conectar à rede. Revisar e atualizar o inventário semestralmente, ou com mais frequência.",
  },
  "1.2": {
    title: "Tratar Ativos Não Autorizados",
    description:
      "Garantir que ativos não autorizados sejam removidos da rede, colocados em quarentena ou que o inventário seja atualizado em tempo hábil.",
  },
  "1.3": {
    title: "Utilizar uma Ferramenta de Descoberta Ativa",
    description:
      "Utilizar uma ferramenta de descoberta ativa para identificar os ativos conectados à rede da empresa. Configurar a ferramenta para executar diariamente ou com mais frequência.",
  },
  "1.4": {
    title: "Usar Logs DHCP para Atualizar o Inventário de Ativos",
    description:
      "Usar logs DHCP para atualizar o inventário de ativos da empresa. Revisar e atualizar o mapeamento mensalmente ou com mais frequência.",
  },
  "1.5": {
    title: "Usar uma Ferramenta de Descoberta Passiva de Ativos",
    description:
      "Usar uma ferramenta de descoberta passiva para identificar os ativos conectados à rede da empresa. Revisar e atualizar o inventário semestralmente ou com mais frequência.",
  },

  // Control 2
  "2.1": {
    title: "Estabelecer e Manter um Inventário de Software",
    description:
      "Estabelecer e manter um inventário detalhado de todo o software licenciado instalado nos ativos da empresa. O inventário deve documentar título, fabricante, data inicial de instalação/uso e propósito de negócio para cada instalação; definir os casos de negócio permitidos para instalar software; e identificar a localização do ativo e/ou usuário para cada instalação. Revisar e atualizar semestralmente ou com mais frequência.",
  },
  "2.2": {
    title: "Garantir que o Software Autorizado Esteja Suportado",
    description:
      "Garantir que apenas software atualmente suportado seja designado como autorizado no inventário. Se o software não tiver suporte, mas for necessário para cumprir a missão da empresa, documentar uma exceção detalhando controles compensatórios e um plano de substituição em até 180 dias. Revisar a lista de software pelo menos mensalmente.",
  },
  "2.3": {
    title: "Tratar Software Não Autorizado",
    description:
      "Garantir que o software não autorizado seja removido dos ativos da empresa ou receba uma exceção documentada. Revisar mensalmente ou com mais frequência.",
  },
  "2.4": {
    title: "Utilizar Ferramentas Automatizadas de Inventário de Software",
    description:
      "Utilizar ferramentas de inventário de software, quando possível, em toda a empresa para automatizar a documentação do software instalado nos ativos.",
  },
  "2.5": {
    title: "Permitir Apenas Software Autorizado (Allowlist)",
    description:
      "Usar controles técnicos, como allowlisting de aplicações, para garantir que apenas o software autorizado possa ser executado ou acessado. Reavaliar semestralmente ou com mais frequência.",
  },
  "2.6": {
    title: "Permitir Apenas Bibliotecas Autorizadas (Allowlist)",
    description:
      "Usar controles técnicos para garantir que apenas bibliotecas de software autorizadas, como arquivos .dll, .ocx, .so, etc., possam ser carregadas em um processo do sistema. Bloquear bibliotecas não autorizadas. Reavaliar semestralmente.",
  },
  "2.7": {
    title: "Permitir Apenas Scripts Autorizados (Allowlist)",
    description:
      "Usar controles técnicos, como assinaturas digitais e controle de versão, para garantir que apenas scripts autorizados (por exemplo, .ps1, .py) possam ser executados. Bloquear scripts não autorizados. Reavaliar semestralmente.",
  },

  // Control 3
  "3.1": {
    title: "Estabelecer e Manter um Processo de Gerenciamento de Dados",
    description:
      "Estabelecer e manter um processo de gerenciamento de dados que aborde sensibilidade dos dados, dono dos dados, manipulação, limites de retenção e requisitos de descarte. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "3.2": {
    title: "Estabelecer e Manter um Inventário de Dados",
    description:
      "Estabelecer e manter um inventário de dados, baseado no processo de gerenciamento de dados da empresa. Inventariar pelo menos os dados sensíveis. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "3.3": {
    title: "Configurar Listas de Controle de Acesso a Dados",
    description:
      "Configurar listas de controle de acesso baseadas na necessidade de saber do usuário e garantir que o acesso seja negado por padrão. Revisar e atualizar trimestralmente ou com mais frequência.",
  },
  "3.4": {
    title: "Aplicar Retenção de Dados",
    description:
      "Reter os dados conforme o processo de gerenciamento de dados da empresa. A retenção deve ser definida e cumprir requisitos regulatórios e de compliance.",
  },
  "3.5": {
    title: "Descartar Dados de Forma Segura",
    description:
      "Descartar de forma segura os dados conforme o processo de gerenciamento da empresa, pelo menos anualmente. O método de descarte deve ser proporcional à sensibilidade dos dados.",
  },
  "3.6": {
    title: "Criptografar Dados em Dispositivos de Usuário Final",
    description:
      "Criptografar os dados em dispositivos de usuário final que contenham dados sensíveis. Exemplos: Windows BitLocker®, Apple FileVault®, Linux® dm-crypt.",
  },
  "3.7": {
    title: "Estabelecer e Manter um Esquema de Classificação de Dados",
    description:
      "Estabelecer e manter um esquema geral de classificação de dados. Categorias de exemplo: top secret, secreto, confidencial, sensível e público. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "3.8": {
    title: "Documentar Fluxos de Dados",
    description:
      "Documentar fluxos de dados. Inclui fluxos de provedores de serviço e deve ser baseado no processo de gerenciamento. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "3.9": {
    title: "Criptografar Dados em Mídia Removível",
    description: "Criptografar dados armazenados em mídia removível.",
  },
  "3.10": {
    title: "Criptografar Dados Sensíveis em Trânsito",
    description:
      "Criptografar dados sensíveis em trânsito. Exemplos: TLS (Transport Layer Security) e Open Secure Shell (OpenSSH).",
  },
  "3.11": {
    title: "Criptografar Dados Sensíveis em Repouso",
    description:
      "Criptografar dados sensíveis em repouso em servidores, aplicações e bancos de dados. A criptografia em camada de armazenamento (server-side) atende ao requisito mínimo. Criptografia adicional em camada de aplicação fornece defesa em profundidade.",
  },
  "3.12": {
    title: "Segmentar Processamento e Armazenamento de Dados pela Sensibilidade",
    description:
      "Segmentar processamento e armazenamento de dados pela sensibilidade. Não processar dados sensíveis em ativos destinados a dados de menor sensibilidade.",
  },
  "3.13": {
    title: "Implantar uma Solução de Prevenção contra Perda de Dados (DLP)",
    description:
      "Implantar uma solução de DLP nos ativos da empresa que monitore, detecte e bloqueie a exfiltração de dados sensíveis.",
  },
  "3.14": {
    title: "Registrar o Acesso a Dados Sensíveis",
    description:
      "Registrar o acesso a dados sensíveis. Exemplos: monitorar acesso a dados sensíveis em ativos da empresa e, em alguns casos, logging abrangente em sistemas de armazenamento com dados sensíveis.",
  },

  // Control 4
  "4.1": {
    title: "Estabelecer e Manter um Processo de Configuração Segura",
    description:
      "Estabelecer e manter um processo de configuração segura para ativos da empresa (dispositivos de usuário final, incluindo portáteis e móveis; dispositivos não-computacionais/IoT; e servidores) e software (sistemas operacionais e aplicações). Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "4.2": {
    title: "Estabelecer e Manter um Processo de Configuração Segura para a Infraestrutura de Rede",
    description:
      "Estabelecer e manter um processo de configuração segura para os dispositivos de rede. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "4.3": {
    title: "Configurar Bloqueio Automático de Sessão nos Ativos da Empresa",
    description:
      "Configurar o bloqueio automático de sessão nos ativos da empresa após um período definido de inatividade. Para sistemas operacionais de propósito geral, o período não deve exceder 15 minutos. Para dispositivos móveis, o período não deve exceder 2 minutos. Para casos específicos, pode ser definida uma exceção aprovada.",
  },
  "4.4": {
    title: "Implementar e Gerenciar um Firewall em Servidores",
    description:
      "Implementar e gerenciar um firewall baseado em host ou ferramenta de filtragem de portas em todos os servidores, com regra padrão de negar todo o tráfego exceto serviços e portas explicitamente permitidos.",
  },
  "4.5": {
    title: "Implementar e Gerenciar um Firewall em Dispositivos de Usuário Final",
    description:
      "Implementar e gerenciar um firewall baseado em host ou ferramenta de filtragem de portas em dispositivos de usuário final, com regra padrão de negar todo o tráfego exceto serviços e portas explicitamente permitidos.",
  },
  "4.6": {
    title: "Gerenciar com Segurança os Ativos e Software da Empresa",
    description:
      "Gerenciar com segurança ativos e software. Exemplos: restringir privilégios administrativos a uma conta administrativa dedicada; usar uma senha separada para a conta administrativa; e exigir autenticação multifator para a conta administrativa.",
  },
  "4.7": {
    title: "Gerenciar Contas Padrão em Ativos e Software",
    description:
      "Gerenciar contas padrão em ativos e software, como root, administrador e outras contas pré-configuradas pelo fornecedor. Exemplos: desabilitar contas padrão ou torná-las inutilizáveis.",
  },
  "4.8": {
    title: "Desinstalar ou Desabilitar Serviços Desnecessários",
    description:
      "Desinstalar ou desabilitar serviços desnecessários em ativos e software, como serviços de compartilhamento de arquivos não usados, módulos de aplicação web ou funções de serviço.",
  },
  "4.9": {
    title: "Configurar Servidores DNS Confiáveis nos Ativos",
    description:
      "Configurar os ativos para usar servidores DNS confiáveis. Exemplos: proteger ativos contra sequestro de DNS configurando servidores DNS confiáveis e monitorando alterações.",
  },

  // Control 5
  "5.1": {
    title: "Estabelecer e Manter um Inventário de Contas",
    description:
      "Estabelecer e manter um inventário de todas as contas gerenciadas na empresa. O inventário deve conter, no mínimo, nome da pessoa, nome de usuário, departamento e a data em que o acesso foi concedido. Revisar e atualizar pelo menos trimestralmente para confirmar que todas as contas ativas estão autorizadas.",
  },
  "5.2": {
    title: "Usar Senhas Únicas",
    description:
      "Usar senhas únicas em todos os ativos da empresa. A boa prática inclui, no mínimo, senha de 8 caracteres para contas com MFA e 14 caracteres para contas sem MFA.",
  },
  "5.3": {
    title: "Desabilitar Contas Inativas",
    description:
      "Excluir ou desabilitar quaisquer contas inativas após 45 dias de inatividade, onde suportado. Desabilitar contas inativas que não possam ser excluídas.",
  },
  "5.4": {
    title: "Restringir Privilégios de Administrador a Contas Dedicadas",
    description:
      "Restringir privilégios administrativos a contas administrativas dedicadas. Realizar atividades gerais (navegação, e-mail, suíte de produtividade) a partir da conta primária sem privilégios.",
  },
  "5.5": {
    title: "Estabelecer e Manter um Inventário de Contas de Serviço",
    description:
      "Estabelecer e manter um inventário de contas de serviço. O inventário deve conter, no mínimo, departamento dono, data de revisão e propósito. Realizar revisões pelo menos trimestralmente para validar que todas as contas ativas estão autorizadas.",
  },
  "5.6": {
    title: "Centralizar o Gerenciamento de Contas",
    description:
      "Centralizar o gerenciamento de contas através de um serviço de diretório ou provedor SSO, onde suportado.",
  },

  // Control 6
  "6.1": {
    title: "Estabelecer um Processo de Concessão de Acesso",
    description:
      "Estabelecer e seguir um processo, preferencialmente automatizado, para conceder acesso a ativos da empresa em contratação, concessão de direitos ou mudança de função.",
  },
  "6.2": {
    title: "Estabelecer um Processo de Revogação de Acesso",
    description:
      "Estabelecer e seguir um processo, preferencialmente automatizado, para revogar acesso a ativos da empresa em desligamento, revogação de direitos ou mudança de função.",
  },
  "6.3": {
    title: "Exigir MFA para Aplicações Expostas Externamente",
    description:
      "Exigir MFA para todas as aplicações expostas externamente, próprias ou de terceiros, onde suportado. Aplicar MFA via serviço de diretório ou provedor SSO atende a este safeguard.",
  },
  "6.4": {
    title: "Exigir MFA para Acesso Remoto à Rede",
    description: "Exigir MFA para acesso remoto à rede da empresa, onde suportado.",
  },
  "6.5": {
    title: "Exigir MFA para Acesso Administrativo",
    description:
      "Exigir MFA em todas as contas com acesso administrativo, onde suportado, em todos os ativos e software, gerenciados ou on-premises, independentemente de o ativo ser acessado remota ou localmente.",
  },
  "6.6": {
    title: "Estabelecer e Manter um Inventário de Sistemas de Autenticação e Autorização",
    description:
      "Estabelecer e manter um inventário dos sistemas de autenticação e autorização da empresa, incluindo os hospedados internamente ou por terceiros. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "6.7": {
    title: "Centralizar o Controle de Acesso",
    description:
      "Centralizar o controle de acesso a todos os ativos via serviço de diretório ou provedor SSO, onde suportado.",
  },
  "6.8": {
    title: "Definir e Manter Controle de Acesso Baseado em Função",
    description:
      "Definir e manter controle de acesso baseado em função, determinando e documentando os direitos de acesso necessários para cada papel da empresa. Realizar revisões pelo menos trimestralmente para validar que todos os privilégios estão autorizados.",
  },

  // Control 7
  "7.1": {
    title: "Estabelecer e Manter um Processo de Gerenciamento de Vulnerabilidades",
    description:
      "Estabelecer e manter um processo documentado de gerenciamento de vulnerabilidades para os ativos da empresa. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "7.2": {
    title: "Estabelecer e Manter um Processo de Remediação",
    description:
      "Estabelecer e manter uma estratégia de remediação baseada em risco, documentada em um processo de remediação, com revisões mensais ou mais frequentes.",
  },
  "7.3": {
    title: "Realizar Gerenciamento Automatizado de Patches do SO",
    description:
      "Realizar atualizações de sistema operacional nos ativos via gerenciamento automatizado de patches, mensalmente ou com mais frequência.",
  },
  "7.4": {
    title: "Realizar Gerenciamento Automatizado de Patches de Aplicação",
    description:
      "Realizar atualizações de aplicações nos ativos via gerenciamento automatizado de patches, mensalmente ou com mais frequência.",
  },
  "7.5": {
    title: "Realizar Varreduras Automatizadas de Vulnerabilidades em Ativos Internos",
    description:
      "Realizar varreduras automatizadas de vulnerabilidades em ativos internos trimestralmente ou com mais frequência. Realizar varreduras autenticadas e não autenticadas.",
  },
  "7.6": {
    title: "Realizar Varreduras Automatizadas de Vulnerabilidades em Ativos Expostos Externamente",
    description:
      "Realizar varreduras automatizadas de vulnerabilidades em ativos expostos externamente trimestralmente ou com mais frequência. Realizar varreduras autenticadas e não autenticadas.",
  },
  "7.7": {
    title: "Remediar as Vulnerabilidades Detectadas",
    description:
      "Remediar as vulnerabilidades detectadas em software por meio de processos mensais ou mais frequentes, conforme o processo de remediação.",
  },

  // Control 8
  "8.1": {
    title: "Estabelecer e Manter um Processo de Gerenciamento de Logs de Auditoria",
    description:
      "Estabelecer e manter um processo de gerenciamento de logs que defina os requisitos de logging da empresa. Como mínimo, abordar os tipos de logs a serem retidos, recursos a alocar e janela de retenção. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "8.2": {
    title: "Coletar Logs de Auditoria",
    description:
      "Coletar logs de auditoria. Garantir que o logging, conforme o processo da empresa, esteja habilitado e configurado conforme os requisitos.",
  },
  "8.3": {
    title: "Garantir Capacidade Adequada de Armazenamento de Logs de Auditoria",
    description:
      "Garantir que a capacidade de armazenamento de logs de auditoria seja suficiente para retê-los conforme o processo da empresa.",
  },
  "8.4": {
    title: "Padronizar a Sincronização de Tempo",
    description:
      "Padronizar a sincronização de tempo. Configurar os ativos da empresa para usar sincronização de tempo. Como mínimo, devem usar a infraestrutura de sincronização de tempo da empresa.",
  },
  "8.5": {
    title: "Coletar Logs de Auditoria Detalhados",
    description:
      "Configurar logging detalhado em ativos com dados sensíveis. Incluir origem do evento, data, usuário, timestamp, endereços de origem e destino, e outros elementos úteis para investigação forense.",
  },
  "8.6": {
    title: "Coletar Logs de Consultas DNS",
    description:
      "Coletar logs de consultas DNS. Configurar o logging para incluir IP de origem, IP de destino e nome da consulta.",
  },
  "8.7": {
    title: "Coletar Logs de Solicitações URL",
    description:
      "Coletar logs de solicitações URL nos ativos da empresa, onde apropriado e suportado, incluindo IP de origem, IP de destino, porta de destino e timestamp.",
  },
  "8.8": {
    title: "Coletar Logs de Auditoria de Linha de Comando",
    description:
      "Coletar logs de auditoria de linha de comando. Exemplos: PowerShell®, Bash® e cmd.exe.",
  },
  "8.9": {
    title: "Centralizar Logs de Auditoria",
    description:
      "Centralizar, na medida do possível, a coleta e retenção de logs de auditoria em todos os ativos da empresa.",
  },
  "8.10": {
    title: "Reter Logs de Auditoria",
    description: "Reter logs de auditoria nos ativos da empresa por um mínimo de 90 dias.",
  },
  "8.11": {
    title: "Realizar Revisões de Logs de Auditoria",
    description:
      "Realizar revisões de logs de auditoria para detectar anomalias ou eventos anormais que possam indicar uma ameaça potencial. Realizar revisões semanalmente ou com mais frequência. Se possível, automatizar.",
  },
  "8.12": {
    title: "Coletar Logs de Provedores de Serviço",
    description:
      "Coletar logs de provedores de serviço, onde suportado, para manter visibilidade sobre as ações dos provedores nos ativos da empresa.",
  },

  // Control 9
  "9.1": {
    title: "Garantir o Uso Apenas de Navegadores e Clientes de E-mail Suportados",
    description:
      "Garantir que apenas navegadores e clientes de e-mail totalmente suportados sejam permitidos para execução na empresa, usando apenas a versão mais recente fornecida pelo fabricante.",
  },
  "9.2": {
    title: "Usar Serviços de Filtragem DNS",
    description:
      "Usar serviços de filtragem DNS em todos os ativos da empresa para bloquear o acesso a domínios maliciosos conhecidos.",
  },
  "9.3": {
    title: "Manter e Aplicar Filtros de URL Baseados em Rede",
    description:
      "Aplicar e atualizar filtros de URL baseados em rede para limitar a conexão dos ativos a sites potencialmente maliciosos ou não aprovados. Exemplos: filtragem por categoria, por reputação ou listas de bloqueio.",
  },
  "9.4": {
    title: "Restringir Extensões Desnecessárias de Navegador e E-mail",
    description:
      "Restringir a instalação de extensões, complementos ou plugins desnecessários ou não autorizados em navegadores ou clientes de e-mail.",
  },
  "9.5": {
    title: "Implementar DMARC",
    description:
      "Implementar DMARC (Domain-based Message Authentication, Reporting, and Conformance) e habilitar relatórios do lado do receptor. Como mínimo, implementar política DMARC p=none. À medida que o DMARC amadurece, progredir para quarantine e eventualmente reject.",
  },
  "9.6": {
    title: "Bloquear Tipos de Arquivo Desnecessários",
    description: "Bloquear tipos de arquivo desnecessários que tentem entrar no gateway de e-mail da empresa.",
  },
  "9.7": {
    title: "Implantar e Manter Proteções Anti-Malware em Servidores de E-mail",
    description: "Implantar e manter software anti-malware em todos os servidores de e-mail.",
  },

  // Control 10
  "10.1": {
    title: "Implantar e Manter Software Anti-Malware",
    description: "Implantar e manter software anti-malware em todos os ativos da empresa.",
  },
  "10.2": {
    title: "Configurar Atualizações Automáticas de Assinaturas Anti-Malware",
    description: "Configurar atualizações automáticas de arquivos de assinaturas anti-malware em todos os ativos.",
  },
  "10.3": {
    title: "Desabilitar Autorun e Autoplay para Mídia Removível",
    description: "Desabilitar capacidades de auto-execução (autorun e autoplay) para mídia removível.",
  },
  "10.4": {
    title: "Configurar Varredura Automática de Mídia Removível",
    description: "Configurar o software anti-malware para varrer automaticamente a mídia removível na conexão.",
  },
  "10.5": {
    title: "Habilitar Recursos Anti-Exploração",
    description:
      "Habilitar recursos anti-exploração, como Data Execution Prevention (DEP), Address Space Layout Randomization (ASLR), virtualização/contêineres, etc.",
  },
  "10.6": {
    title: "Gerenciar Centralmente o Software Anti-Malware",
    description: "Gerenciar centralmente o software anti-malware.",
  },
  "10.7": {
    title: "Usar Software Anti-Malware Baseado em Comportamento",
    description: "Usar software anti-malware baseado em comportamento.",
  },

  // Control 11
  "11.1": {
    title: "Estabelecer e Manter um Processo de Recuperação de Dados",
    description:
      "Estabelecer e manter um processo de recuperação de dados. Abordar o escopo das atividades de recuperação, priorização e segurança dos dados de backup. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "11.2": {
    title: "Realizar Backups Automatizados",
    description:
      "Realizar backups automatizados dos ativos no escopo. Executar backups semanalmente ou com mais frequência. Recuperar dados pelo menos trimestralmente para verificar a integridade dos backups.",
  },
  "11.3": {
    title: "Proteger os Dados de Recuperação",
    description:
      "Proteger os dados de recuperação com controles equivalentes aos dos dados originais. Aplicar controles de acesso, criptografia e isolamento aos backups.",
  },
  "11.4": {
    title: "Estabelecer e Manter uma Instância Isolada de Dados de Recuperação",
    description:
      "Estabelecer e manter uma instância isolada de dados de recuperação. Exemplos: versionamento de backups em soluções na nuvem ou air-gap de instâncias locais.",
  },
  "11.5": {
    title: "Testar a Recuperação de Dados",
    description: "Testar a recuperação de dados trimestralmente ou com mais frequência, a partir dos dados de backup.",
  },

  // Control 12
  "12.1": {
    title: "Garantir que a Infraestrutura de Rede Esteja Atualizada",
    description:
      "Garantir que a infraestrutura de rede seja mantida atualizada. Exemplos: executar a versão estável mais recente do software e/ou as atualmente suportadas pelo fornecedor.",
  },
  "12.2": {
    title: "Estabelecer e Manter uma Arquitetura de Rede Segura",
    description:
      "Estabelecer e manter uma arquitetura de rede segura. Como mínimo, abordar segmentação, mínimo privilégio e disponibilidade.",
  },
  "12.3": {
    title: "Gerenciar com Segurança a Infraestrutura de Rede",
    description:
      "Gerenciar com segurança a infraestrutura de rede. Exemplos: protocolos seguros como HTTPS e SSH e autenticação multifator para acesso administrativo.",
  },
  "12.4": {
    title: "Estabelecer e Manter Diagramas de Arquitetura",
    description:
      "Estabelecer e manter diagramas de arquitetura e/ou outra documentação do sistema de rede. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "12.5": {
    title: "Centralizar Autenticação, Autorização e Auditoria de Rede (AAA)",
    description: "Centralizar AAA de rede.",
  },
  "12.6": {
    title: "Usar Protocolos Seguros de Gerenciamento e Comunicação de Rede",
    description:
      "Usar protocolos seguros de gerenciamento e comunicação de rede. Usar protocolos como SSH e HTTPS para administração da infraestrutura. Desabilitar protocolos desnecessários ou inseguros.",
  },
  "12.7": {
    title: "Garantir que Dispositivos Remotos Usem VPN e se Conectem ao AAA da Empresa",
    description:
      "Exigir que os usuários se autentiquem na VPN gerenciada pela empresa e nos serviços de autenticação antes de acessar recursos da empresa em dispositivos de usuário final.",
  },
  "12.8": {
    title: "Estabelecer e Manter Recursos Computacionais Dedicados para Trabalhos Administrativos",
    description:
      "Estabelecer e manter recursos computacionais dedicados, separados física ou logicamente, para todas as tarefas administrativas ou tarefas que exijam acesso administrativo. A empresa deve usar esses recursos apenas para tarefas que requeiram acesso administrativo.",
  },

  // Control 13
  "13.1": {
    title: "Centralizar o Alerta de Eventos de Segurança",
    description:
      "Centralizar o alerta de eventos de segurança. Os sistemas de detecção, prevenção e alerta devem estar integrados para fornecer uma visão única de todos os alertas da empresa.",
  },
  "13.2": {
    title: "Implantar uma Solução de Detecção de Intrusão Baseada em Host",
    description:
      "Implantar uma solução de detecção de intrusão baseada em host (HIDS) nos ativos onde apropriado e/ou suportado.",
  },
  "13.3": {
    title: "Implantar uma Solução de Detecção de Intrusão de Rede",
    description:
      "Implantar uma solução de detecção de intrusão de rede (NIDS) nos ativos onde apropriado, ou equivalentes em provedores de nuvem.",
  },
  "13.4": {
    title: "Realizar Filtragem de Tráfego entre Segmentos de Rede",
    description: "Realizar filtragem de tráfego entre segmentos de rede, onde apropriado.",
  },
  "13.5": {
    title: "Gerenciar Controle de Acesso para Ativos Remotos",
    description:
      "Gerenciar o controle de acesso para ativos que se conectam remotamente a recursos da empresa. Determinar e documentar os requisitos de acesso para todos os ativos remotos. Exemplos: usar uma conta administrativa separada para acesso remoto e limitar quais usuários podem se conectar remotamente.",
  },
  "13.6": {
    title: "Coletar Logs de Fluxo de Tráfego de Rede",
    description:
      "Coletar logs de fluxo de tráfego de rede e/ou tráfego de rede para auxiliar na investigação de atividade anormal.",
  },
  "13.7": {
    title: "Implantar uma Solução de Prevenção de Intrusão Baseada em Host",
    description:
      "Implantar uma solução de prevenção de intrusão baseada em host (HIPS) nos ativos onde apropriado e/ou suportado. Exemplos: soluções EDR.",
  },
  "13.8": {
    title: "Implantar uma Solução de Prevenção de Intrusão de Rede",
    description:
      "Implantar uma solução de prevenção de intrusão de rede (NIPS) onde apropriado, ou equivalentes em provedores de nuvem.",
  },
  "13.9": {
    title: "Implantar Controle de Acesso a Nível de Porta",
    description:
      "Implantar controle de acesso a nível de porta, onde apropriado. Pode ser implementado via 802.1x ou tecnologias equivalentes.",
  },
  "13.10": {
    title: "Realizar Filtragem em Camada de Aplicação",
    description: "Realizar filtragem em camada de aplicação. Exemplos: uso de proxies ou WAFs.",
  },
  "13.11": {
    title: "Ajustar Limiares de Alerta de Eventos de Segurança",
    description: "Ajustar os limiares de alerta de eventos de segurança mensalmente ou com mais frequência.",
  },

  // Control 14
  "14.1": {
    title: "Estabelecer e Manter um Programa de Conscientização em Segurança",
    description:
      "Estabelecer e manter um programa de conscientização em segurança. O propósito é educar a força de trabalho sobre como interagir com os ativos e dados de forma segura. Realizar treinamentos no momento da contratação e, no mínimo, anualmente. Revisar e atualizar o conteúdo anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "14.2": {
    title: "Treinar Membros da Força de Trabalho para Reconhecer Ataques de Engenharia Social",
    description:
      "Treinar a força de trabalho para reconhecer ataques de engenharia social, como phishing, pre-texting e tailgating.",
  },
  "14.3": {
    title: "Treinar Força de Trabalho em Boas Práticas de Autenticação",
    description:
      "Treinar a força de trabalho em boas práticas de autenticação. Exemplos: MFA, composição de senhas e gerenciamento de credenciais.",
  },
  "14.4": {
    title: "Treinar Força de Trabalho em Boas Práticas de Manipulação de Dados",
    description:
      "Treinar a força de trabalho sobre como identificar e armazenar, transferir, arquivar ou destruir adequadamente informações sensíveis.",
  },
  "14.5": {
    title: "Treinar Força de Trabalho sobre Causas de Exposição Não Intencional de Dados",
    description:
      "Treinar a força de trabalho para estar consciente das causas de exposição não intencional de dados. Exemplos: envio de senhas em texto claro ou dados sensíveis como anexo, ou não bloquear o computador ao se afastar.",
  },
  "14.6": {
    title: "Treinar Força de Trabalho a Reconhecer e Reportar Incidentes de Segurança",
    description: "Treinar a força de trabalho para ser capaz de reconhecer um potencial incidente e reportá-lo.",
  },
  "14.7": {
    title: "Treinar Força de Trabalho sobre Identificação e Reporte de Ativos sem Atualizações de Segurança",
    description:
      "Treinar a força de trabalho sobre como identificar e reportar se seus ativos estão sem atualizações de segurança, com assinaturas antivírus desatualizadas ou que não foram escaneados recentemente.",
  },
  "14.8": {
    title: "Treinar Força de Trabalho sobre Perigos de Redes Inseguras",
    description:
      "Treinar a força de trabalho sobre os perigos de conectar e transmitir dados por redes inseguras (por exemplo, Wi-Fi pública), e sobre os procedimentos para garantir conexões e transmissões seguras.",
  },
  "14.9": {
    title: "Realizar Treinamento de Conscientização Específico por Função",
    description:
      "Realizar treinamento de conscientização e habilidades específico por função. Exemplos: treinamento de desenvolvimento seguro para engenheiros de software, ou treinamento para equipes de resposta a incidentes.",
  },

  // Control 15
  "15.1": {
    title: "Estabelecer e Manter um Inventário de Provedores de Serviço",
    description:
      "Estabelecer e manter um inventário de provedores de serviço. Deve registrar o serviço prestado, o tipo de serviço e o contato. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "15.2": {
    title: "Estabelecer e Manter uma Política de Gerenciamento de Provedores de Serviço",
    description:
      "Estabelecer e manter uma política de gerenciamento de provedores de serviço. A política deve exigir que os provedores se submetam a uma avaliação de segurança e que a linguagem contratual contemple o direito de auditoria. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "15.3": {
    title: "Classificar Provedores de Serviço",
    description:
      "Classificar os provedores de serviço. A classificação deve considerar características como sensibilidade dos dados, criticidade do serviço ou acesso à rede da empresa. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "15.4": {
    title: "Garantir que Contratos com Provedores Incluam Requisitos de Segurança",
    description:
      "Garantir que os contratos com provedores incluam requisitos de segurança, como cláusulas de direito de auditoria, para abordar acesso, manipulação e propriedade dos dados da empresa.",
  },
  "15.5": {
    title: "Avaliar os Provedores de Serviço",
    description:
      "Avaliar os provedores anualmente para garantir que cumprem suas obrigações contratuais. Revisar os resultados e documentar quaisquer questões em uma solicitação de desvio.",
  },
  "15.6": {
    title: "Monitorar as Práticas de Segurança dos Provedores",
    description:
      "Monitorar as práticas de segurança dos provedores de forma recorrente para garantir que os controles de segurança estão implementados e operando como esperado.",
  },
  "15.7": {
    title: "Descomissionar Provedores com Segurança",
    description:
      "Descomissionar provedores com segurança. Exemplos: garantir que dados e ativos sejam devolvidos ou destruídos com segurança.",
  },
  "15.8": {
    title: "Estabelecer e Manter Política de Transmissão de Dados com Provedores",
    description:
      "Estabelecer e manter uma política de transmissão de dados com provedores. Deve incluir requisitos de criptografia e integridade, e abordar o acesso aos dados da empresa. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "15.9": {
    title: "Estabelecer e Manter Política de Ativos com Provedores",
    description:
      "Estabelecer e manter uma política de ativos com provedores. Deve identificar se o provedor ou a empresa é dono do ativo, sua localização e o processo de devolução ou destruição. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },

  // Control 16
  "16.1": {
    title: "Estabelecer e Manter um Processo Seguro de Desenvolvimento de Aplicações",
    description:
      "Estabelecer e manter um processo seguro de desenvolvimento de aplicações. Abordar itens como: padrões de design seguro, práticas de codificação segura, treinamento de desenvolvedores, gerenciamento de vulnerabilidades, revisão de código e testes de segurança de aplicações. Revisar e atualizar pelo menos anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "16.2": {
    title: "Estabelecer um Processo para Aceitar e Tratar Vulnerabilidades de Software",
    description:
      "Estabelecer e manter um processo para aceitar e tratar relatos de vulnerabilidades de software, incluindo relatos do público. Como parte do processo, designar um ponto de contato para que o público possa enviar relatos de vulnerabilidades.",
  },
  "16.3": {
    title: "Realizar Análise de Causa Raiz em Vulnerabilidades de Segurança",
    description:
      "Realizar análise de causa raiz em vulnerabilidades de segurança. Quando possível, abordar a causa raiz e não apenas o sintoma.",
  },
  "16.4": {
    title: "Estabelecer e Gerenciar um Inventário de Componentes de Software de Terceiros",
    description:
      "Estabelecer e gerenciar um inventário atualizado de componentes de terceiros usados em desenvolvimento, frequentemente chamado de SBOM (Software Bill of Materials), bem como componentes embarcados no software da empresa. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "16.5": {
    title: "Usar Componentes de Software de Terceiros Atualizados e Confiáveis",
    description:
      "Usar componentes de software de terceiros atualizados e confiáveis. Usar componentes de repositórios confiáveis. Validar a legitimidade dos componentes antes do uso.",
  },
  "16.6": {
    title: "Estabelecer um Sistema de Classificação de Severidade para Vulnerabilidades de Aplicações",
    description:
      "Estabelecer e manter um sistema e processo de classificação de severidade para vulnerabilidades de aplicações que facilite a priorização da remediação com base no impacto ao negócio. Revisar e atualizar anualmente.",
  },
  "16.7": {
    title: "Usar Modelos Padrão de Hardening para Infraestrutura de Aplicações",
    description:
      "Usar modelos padrão de configuração de hardening para infraestrutura de aplicações. Implementar via Infrastructure as Code (IaC).",
  },
  "16.8": {
    title: "Separar Sistemas de Produção e Não Produção",
    description: "Manter ambientes separados para sistemas de produção e não produção.",
  },
  "16.9": {
    title: "Treinar Desenvolvedores em Conceitos de Segurança e Codificação Segura",
    description:
      "Treinar desenvolvedores em conceitos de segurança de aplicações e codificação segura. Realizar treinamento na contratação e anualmente. Revisar e atualizar o treinamento anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "16.10": {
    title: "Aplicar Princípios de Design Seguro nas Arquiteturas de Aplicações",
    description:
      "Aplicar princípios de design seguro em arquiteturas de aplicações. Incluem: mínimo privilégio, mediação obrigatória para validar cada operação do usuário, fail-safe defaults e minimização da superfície de ataque.",
  },
  "16.11": {
    title: "Aproveitar Módulos ou Serviços Validados para Componentes de Segurança",
    description:
      "Aproveitar módulos ou serviços validados para componentes de segurança de aplicações, como autenticação de usuários, controle de acesso e criptografia.",
  },
  "16.12": {
    title: "Implementar Verificações de Segurança a Nível de Código",
    description:
      "Implementar verificações de segurança a nível de código. Exemplos: testes estáticos (SAST), testes dinâmicos (DAST) e análise de composição de software (SCA).",
  },
  "16.13": {
    title: "Realizar Testes de Penetração de Aplicações",
    description:
      "Realizar testes de penetração de aplicações. Para aplicações críticas, testes autenticados são mais apropriados para encontrar vulnerabilidades de lógica de negócio do que escaneamento de código e testes automatizados.",
  },
  "16.14": {
    title: "Realizar Modelagem de Ameaças",
    description:
      "Realizar modelagem de ameaças. É uma forma de avaliação de risco que modela aspectos de ataque e defesa de uma entidade lógica, como um dado, uma aplicação, um componente, uma função ou um serviço.",
  },

  // Control 17
  "17.1": {
    title: "Designar Pessoal para Gerenciar o Tratamento de Incidentes",
    description:
      "Designar uma pessoa-chave e ao menos um suplente que gerenciarão o processo de tratamento de incidentes da empresa. O pessoal de gerenciamento é responsável pela supervisão de todos os componentes do tratamento de incidentes, incluindo contenção e erradicação, e avaliação de risco, e deve ser contatado em caso de incidente.",
  },
  "17.2": {
    title: "Estabelecer e Manter Informações de Contato para Reportar Incidentes",
    description:
      "Estabelecer e manter informações de contato das partes que precisam ser informadas sobre incidentes de segurança. Os contatos podem incluir pessoal interno e entidades externas, como provedores e autoridades. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "17.3": {
    title: "Estabelecer e Manter um Processo Empresarial para Reportar Incidentes",
    description:
      "Estabelecer e manter um processo para que a força de trabalho relate incidentes de segurança. O processo deve incluir relatos de vazamentos de dados sensíveis, dispositivos de usuário final perdidos/roubados, arquivos em papel, possíveis infecções por malware e quaisquer outros incidentes. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "17.4": {
    title: "Estabelecer e Manter um Processo de Resposta a Incidentes",
    description:
      "Estabelecer e manter um processo de resposta a incidentes que aborde papéis e responsabilidades, requisitos de compliance e planos de comunicação. Exemplos baseados em frameworks como NIST SP 800-61r2. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "17.5": {
    title: "Atribuir Papéis e Responsabilidades-Chave para Resposta a Incidentes",
    description:
      "Atribuir papéis e responsabilidades-chave para resposta a incidentes, incluindo contenção, erradicação e recuperação. Atribuir os papéis para que todo o pessoal envolvido saiba o que se espera dele.",
  },
  "17.6": {
    title: "Definir Mecanismos de Comunicação durante a Resposta a Incidentes",
    description:
      "Definir mecanismos de comunicação durante a resposta a incidentes. Exemplos: estabelecer canais de comunicação fora de banda e a capacidade de preservar comunicações.",
  },
  "17.7": {
    title: "Realizar Exercícios Rotineiros de Resposta a Incidentes (Tabletop)",
    description:
      "Realizar exercícios rotineiros de resposta a incidentes (tabletop). Os exercícios devem ocorrer em frequência rotineira, pelo menos anualmente, e envolver pessoal com papel no processo de resposta.",
  },
  "17.8": {
    title: "Realizar Revisões Pós-Incidente",
    description:
      "Realizar revisões pós-incidente. As revisões devem incluir a identificação da causa raiz e as etapas para evitar que o incidente ocorra novamente.",
  },
  "17.9": {
    title: "Estabelecer e Manter Limiares de Incidentes de Segurança",
    description:
      "Estabelecer e manter limiares de incidentes de segurança. Exemplos: estabelecer uma classificação de severidade para incidentes e um processo para priorizá-los com base na severidade.",
  },

  // Control 18
  "18.1": {
    title: "Estabelecer e Manter um Programa de Testes de Penetração",
    description:
      "Estabelecer e manter um programa de testes de penetração apropriado ao tamanho, complexidade e maturidade da empresa. Deve incluir escopo (rede, aplicação web, API, serviços hospedados, controles físicos), frequência, limitações (horários aceitáveis, tipos de ataque excluídos), informações de contato, remediação (como os achados serão encaminhados) e requisitos retrospectivos. Revisar e atualizar anualmente, ou quando ocorrerem mudanças significativas.",
  },
  "18.2": {
    title: "Realizar Testes de Penetração Internos Periódicos",
    description:
      "Realizar testes de penetração internos periódicos com base nos requisitos do programa, no mínimo semestralmente. Os testes podem ser de caixa preta ou caixa branca conforme necessário.",
  },
  "18.3": {
    title: "Remediar Achados de Testes de Penetração",
    description:
      "Remediar os achados dos testes de penetração. É importante priorizar e implementar a remediação apropriada com base na tolerância a risco da empresa e na classificação de risco do achado.",
  },
  "18.4": {
    title: "Validar as Medidas de Segurança",
    description: "Validar as medidas de segurança após a remediação dos achados de testes de penetração.",
  },
  "18.5": {
    title: "Realizar Testes de Penetração Externos Periódicos",
    description:
      "Realizar testes de penetração externos periódicos com base nos requisitos do programa, no mínimo semestralmente. Os testes externos devem incluir reconhecimento da empresa e do ambiente para detectar informações exploráveis. Os testes exigem habilidades e experiência especializadas e devem ser conduzidos por uma parte qualificada. Os testes podem ser de caixa preta ou branca conforme necessário.",
  },
};

/* ============================================================
 * Lookup helpers
 * ============================================================ */

export function localizeControl(control: Control, lang: Language): Control {
  if (lang === "en") return control;
  const ctrlMap = lang === "es" ? ES_CONTROLS : PT_CONTROLS;
  const sgMap = lang === "es" ? ES_SAFEGUARDS : PT_SAFEGUARDS;
  const cTr = ctrlMap[control.cis_id];

  return {
    ...control,
    name: cTr?.name ?? control.name,
    objective: cTr?.objective ?? control.objective,
    safeguards: control.safeguards.map((sg) => {
      const tr = sgMap[sg.safeguard_id];
      return {
        ...sg,
        title: tr?.title ?? sg.title,
        description: tr?.description ?? sg.description,
      };
    }),
  };
}

export function localizeSafeguard(sg: Safeguard, lang: Language): Safeguard {
  if (lang === "en") return sg;
  const sgMap = lang === "es" ? ES_SAFEGUARDS : PT_SAFEGUARDS;
  const tr = sgMap[sg.safeguard_id];
  if (!tr) return sg;
  return { ...sg, title: tr.title, description: tr.description };
}

export function localizeControlName(cisId: string, fallback: string, lang: Language): string {
  if (lang === "en") return fallback;
  const ctrlMap = lang === "es" ? ES_CONTROLS : PT_CONTROLS;
  return ctrlMap[cisId]?.name ?? fallback;
}
