from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.api.deps import get_db, require_auditor
from app.services.report_service import generate_pdf_report, generate_xlsx_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/pdf")
def export_pdf(db: Session = Depends(get_db), _=Depends(require_auditor)):
    pdf_bytes = generate_pdf_report(db)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=csat-report.pdf"},
    )


@router.post("/xlsx")
def export_xlsx(db: Session = Depends(get_db), _=Depends(require_auditor)):
    xlsx_bytes = generate_xlsx_report(db)
    return StreamingResponse(
        BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=csat-report.xlsx"},
    )
