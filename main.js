/**
 * Dibuja la imagen del Matrimonios.
 * MODIFICADO: Uso de tabla, eliminación de '**', título 'MATRIMONIOS', degradado azul/verde.
 */
const generateMarriageCertificateImage = async (rawDocumento, principal, data) => {
    
    const API_NAME = "MATRIMONIOS";
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 1000;
    const MARGIN_X = 50;
    const MARGIN_Y = 50;
    const INNER_WIDTH = CANVAS_WIDTH - 2 * MARGIN_X;
    
    // 1. Generación del Canvas
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // Fondo (Simulación de papel formal)
    ctx.fillStyle = '#F5F5DC'; // Beige claro
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // AGREGADO: Degradado de nube azul/verde en el centro
    const gradient = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50, 
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2
    );
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.2)'); // Azul Cian claro
    gradient.addColorStop(0.5, 'rgba(144, 238, 144, 0.1)'); // Verde pálido claro
    gradient.addColorStop(1, 'rgba(245, 245, 220, 0)'); // Transparente (se mezcla con el fondo)
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Borde Decorativo (Simulación de sello/marco oficial)
    ctx.strokeStyle = '#8B0000'; // Rojo oscuro (Gobierno/Oficial)
    ctx.lineWidth = 15;
    ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
    ctx.strokeStyle = '#4A148C'; // Púrpura oscuro
    ctx.lineWidth = 3;
    ctx.strokeRect(MARGIN_X - 10, MARGIN_Y - 10, INNER_WIDTH + 20, CANVAS_HEIGHT - 2 * MARGIN_Y + 20);

    // 2. Encabezado Oficial
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    
    let currentY = MARGIN_Y + 30;
    
    ctx.font = `bold 24px ${FONT_FAMILY}`;
    ctx.fillText("REPÚBLICA DEL PERÚ", CANVAS_WIDTH / 2, currentY);
    
    currentY += 30;
    ctx.font = `bold 30px ${FONT_FAMILY}`;
    ctx.fillText("REGISTRO NACIONAL DE IDENTIFICACIÓN Y ESTADO CIVIL", CANVAS_WIDTH / 2, currentY);
    
    currentY += 40;
    ctx.fillStyle = '#8B0000';
    ctx.font = `bold 40px serif`;
    // CAMBIO: Título 'MATRIMONIOS'
    ctx.fillText("CERTIFICADO DE MATRIMONIOS", CANVAS_WIDTH / 2, currentY);

    // Línea divisoria
    currentY += 15;
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, currentY);
    ctx.lineTo(CANVAS_WIDTH - MARGIN_X, currentY);
    ctx.stroke();

    // 3. Configuración de la Tabla
    currentY += 20;
    const tableStartY = currentY;
    const padding = 10;
    const rowHeight = 35;
    
    // Colores de la tabla
    const headerBg = '#4A148C'; // Púrpura oscuro
    const headerColor = '#FFFFFF';
    const rowBg1 = '#EEEEEE';
    const rowBg2 = '#FFFFFF';
    const cellColor = '#000000';
    const tableBorder = '#333333';
    
    const colWidths = [INNER_WIDTH * 0.40, INNER_WIDTH * 0.60]; // 40% Etiqueta, 60% Valor
    let tableY = tableStartY;
    let rowIndex = 0;
    
    // Función para dibujar una celda
    const drawCell = (text, x, y, width, height, bg, color, isLabel = false) => {
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, width, height);
        
        ctx.strokeStyle = tableBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        
        ctx.fillStyle = color;
        ctx.textAlign = isLabel ? 'left' : 'left';
        ctx.font = isLabel ? `bold 14px ${FONT_FAMILY}` : `14px ${FONT_FAMILY}`;
        ctx.fillText(text.toUpperCase() || 'N/A', x + padding, y + height / 2 + 5);
    };

    // Función para dibujar una fila de datos
    const drawDataRow = (label, value) => {
        const bg = rowIndex % 2 === 0 ? rowBg1 : rowBg2;
        
        // Columna 1: Etiqueta
        drawCell(label, MARGIN_X, tableY, colWidths[0], rowHeight, bg, cellColor, true);
        
        // Columna 2: Valor
        drawCell(String(value), MARGIN_X + colWidths[0], tableY, colWidths[1], rowHeight, bg, cellColor, false);
        
        tableY += rowHeight;
        rowIndex++;
    };
    
    // Función para dibujar un encabezado de sección de tabla
    const drawTableHeader = (title) => {
        ctx.fillStyle = headerBg;
        ctx.fillRect(MARGIN_X, tableY, INNER_WIDTH, rowHeight);
        ctx.strokeStyle = tableBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(MARGIN_X, tableY, INNER_WIDTH, rowHeight);
        
        ctx.fillStyle = headerColor;
        ctx.textAlign = 'center';
        ctx.font = `bold 16px ${FONT_FAMILY}`;
        // CAMBIO: Eliminación de **
        ctx.fillText(title.toUpperCase(), MARGIN_X + INNER_WIDTH / 2, tableY + rowHeight / 2 + 5);
        
        tableY += rowHeight;
        rowIndex = 0; // Reiniciar para el patrón de filas
    };
    
    // 4. Llenado de la Tabla
    
    // Datos de Registro
    drawTableHeader("Detalles de Registro");
    drawDataRow("REGISTRO ÚNICO", data.registro_unico || 'N/A');
    drawDataRow("NÚMERO DE MATRIMONIOS", data.nro_acta || 'N/A');
    drawDataRow("OFICINA DE REGISTRO", data.oficina_registro || 'N/A');
    
    // Datos del Evento
    drawTableHeader("Detalles del Evento");
    drawDataRow("FECHA DE MATRIMONIOS", data.fecha_matrimonio || 'N/A');
    drawDataRow("LUGAR DE MATRIMONIOS", `${data.departamento || ''}, ${data.provincia || ''}, ${data.distrito || ''}`.trim().replace(/^, | ,$|, ,/g, ' - ') || 'N/A');
    drawDataRow("RÉGIMEN PATRIMONIAL", data.regimen_patrimonial || 'N/A');
    
    // Cónyuge 1 (Principal)
    const conyuge1 = getFormattedPersonData(principal);
    drawTableHeader("Cónyuge 1 (Principal)");
    drawDataRow("DNI", conyuge1.dni);
    drawDataRow("NOMBRE COMPLETO", `${conyuge1.nombres} ${conyuge1.apellido_paterno} ${conyuge1.apellido_materno}`);
    drawDataRow("FECHA DE NACIMIENTO", principal.fecha_nacimiento || 'N/A');
    drawDataRow("ESTADO CIVIL ANTERIOR", data.estado_civil_c1 || 'N/A');

    // Cónyuge 2 (Pareja)
    const conyuge2 = getFormattedPersonData(data.conyuge || {});
    drawTableHeader("Cónyuge 2 (Pareja)");
    drawDataRow("DNI", conyuge2.dni);
    drawDataRow("NOMBRE COMPLETO", `${conyuge2.nombres} ${conyuge2.apellido_paterno} ${conyuge2.apellido_materno}`);
    drawDataRow("FECHA DE NACIMIENTO", data.conyuge?.fecha_nacimiento || 'N/A');
    drawDataRow("ESTADO CIVIL ANTERIOR", data.estado_civil_c2 || 'N/A');
    
    // Información Adicional
    drawTableHeader("Observaciones");
    // Dibujar la observación como una sola celda
    ctx.fillStyle = rowBg1;
    ctx.fillRect(MARGIN_X, tableY, INNER_WIDTH, rowHeight * 2);
    ctx.strokeStyle = tableBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN_X, tableY, INNER_WIDTH, rowHeight * 2);
    
    ctx.fillStyle = cellColor;
    ctx.textAlign = 'left';
    ctx.font = `14px ${FONT_FAMILY}`;
    const obsText = String(data.observaciones || 'NINGUNA OBSERVACIÓN REGISTRADA').toUpperCase();
    ctx.fillText(obsText, MARGIN_X + padding, tableY + rowHeight);
    tableY += rowHeight * 2;
    
    // 5. Sellos y Firmas (Espacios)
    currentY = tableY + 50;
    ctx.textAlign = 'center';
    ctx.font = `bold 18px ${FONT_FAMILY}`;
    
    // Espacio de Firma 1
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 4, currentY);
    ctx.lineTo(CANVAS_WIDTH / 4, currentY - 50);
    ctx.stroke();
    ctx.fillText("Firma Cónyuge 1", CANVAS_WIDTH / 4, currentY + 20);
    
    // Espacio de Firma 2
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH * 3 / 4, currentY);
    ctx.lineTo(CANVAS_WIDTH * 3 / 4, currentY - 50);
    ctx.stroke();
    ctx.fillText("Firma Cónyuge 2", CANVAS_WIDTH * 3 / 4, currentY + 20);
    
    currentY += 70;
    
    // Espacio de Sello y Registrador
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, currentY);
    ctx.lineTo(CANVAS_WIDTH / 2, currentY - 50);
    ctx.stroke();
    ctx.fillText("Sello y Firma del Registrador Civil", CANVAS_WIDTH / 2, currentY + 20);

    // 6. Pie de Página
    const footerY = CANVAS_HEIGHT - MARGIN_Y + 10;
    ctx.fillStyle = '#000000';
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Generado por MATRIMONIOS el: ${new Date().toLocaleDateString('es-ES')}`, CANVAS_WIDTH - MARGIN_X, footerY);

    return canvas.toBuffer('image/png');
};
