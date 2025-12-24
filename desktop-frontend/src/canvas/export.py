"""
Export utilities for canvas content.
"""
from PyQt5.QtCore import Qt, QRectF, QPoint, QSizeF
from PyQt5.QtGui import QPainter, QImage, QPageSize
from PyQt5.QtPrintSupport import QPrinter



def export_to_image(canvas, filename):
    """Export canvas to image file (PNG/JPG)."""
    image = QImage(canvas.size(), QImage.Format_ARGB32)
    image.fill(Qt.transparent)
    
    painter = QPainter(image)
    canvas.render(painter)
    painter.end()
    image.save(filename)


def export_to_pdf(canvas, filename):
    """Export canvas content to PDF matching JPG output exactly."""
    # Calculate bounding rect of all components
    content_rect = QRectF()
    
    for comp in canvas.components:
         content_rect = content_rect.united(QRectF(comp.geometry()))
         
    # Use full canvas if empty
    if content_rect.isEmpty():
        content_rect = QRectF(canvas.rect())
    else:
        # Add padding
        content_rect.adjust(-50, -50, 50, 50)
        # Clamp to canvas bounds
        canvas_rect = QRectF(canvas.rect())
        content_rect = content_rect.intersected(canvas_rect)
        
    # Create image of content area (same as JPG)
    content_size = content_rect.size().toSize()
    image = QImage(content_size, QImage.Format_ARGB32)
    image.fill(Qt.white)
    
    # Render content to image
    painter_img = QPainter(image)
    painter_img.translate(-content_rect.topLeft())
    canvas.render(painter_img)
    painter_img.end()
    
    # Calculate page size in millimeters (standard PDF units)
    # Assume 96 DPI (standard screen resolution)
    dpi = 96.0
    mm_per_inch = 25.4
    width_mm = (content_size.width() / dpi) * mm_per_inch
    height_mm = (content_size.height() / dpi) * mm_per_inch
    
    # Create PDF with exact page size
    printer = QPrinter(QPrinter.ScreenResolution)
    printer.setOutputFormat(QPrinter.PdfFormat)
    printer.setOutputFileName(filename)
    printer.setPageSize(QPageSize(QSizeF(width_mm, height_mm), QPageSize.Millimeter))
    printer.setPageMargins(0, 0, 0, 0, QPrinter.Millimeter)
    
    # Draw image to PDF
    painter_pdf = QPainter(printer)
    painter_pdf.drawImage(0, 0, image)
    painter_pdf.end()

