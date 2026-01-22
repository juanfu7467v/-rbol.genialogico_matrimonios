const express = require("express");
const axios = require("axios");
const cors = require("cors");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const API_BASE_URL = process.env.API_BASE_URL || "";
const ARBOL_GENEALOGICO_API_URL = process.env.ARBOL_GENEALOGICO_API_URL || "";

// Configuración de dimensiones y colores
const MARGIN_X = 40;
const DOC_WIDTH = 612; // Carta
const CONTENT_WIDTH = DOC_WIDTH - (MARGIN_X * 2); // 532

const COLORS = {
    PATERNA: "#3498DB",
    MATERNA: "#2ECC71",
    POLITICA: "#95A5A6",
    DIRECTA: "#2C3E50",
    ACCENT: "#E74C3C",
    BG_LIGHT: "#F4F7F6",
    TEXT_MAIN: "#333333",
    TEXT_LIGHT: "#777777",
    WHITE: "#FFFFFF"
};

// --- Funciones de Ayuda ---

function clasificarFamilia(coincidences) {
    const grupos = {
        directa: [],
        paterna: [],
        materna: [],
        extendida: []
    };

    coincidences.forEach(p => {
        const tipo = p.tipo.toUpperCase();
        if (["PADRE", "MADRE", "HERMANO", "HERMANA", "HIJO", "HIJA"].includes(tipo)) {
            grupos.directa.push(p);
        } else if (tipo.includes("PATERNO") || tipo.includes("PATERNA")) {
            grupos.paterna.push(p);
        } else if (tipo.includes("MATERNO") || tipo.includes("MATERNA")) {
            grupos.materna.push(p);
        } else {
            grupos.extendida.push(p);
        }
    });
    return grupos;
}

// Dibuja la cabecera azul oscuro respetando el ancho del contenido
function drawHeader(doc, title, yPosition = 0) {
    // Fondo de la cabecera alineado con el resto del contenido
    doc.rect(MARGIN_X, yPosition, CONTENT_WIDTH, 50).fill(COLORS.DIRECTA);
    
    // Título izquierda
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(16)
       .text(title, MARGIN_X + 20, yPosition + 18, { width: 350, align: 'left' });
    
    // Texto derecha
    doc.fontSize(10).font("Helvetica")
       .text("SISTEMA DE CONSULTA", MARGIN_X, yPosition + 22, { width: CONTENT_WIDTH - 20, align: "right" });
}

// Tarjeta de persona con ajuste automático de texto (wrap)
function drawPersonCard(doc, x, y, person, color) {
    const width = 160;
    const height = 75; // Aumentado ligeramente para permitir saltos de línea

    // Sombra
    doc.rect(x + 2, y + 2, width, height).fill("#DDDDDD");
    // Fondo blanco
    doc.rect(x, y, width, height).fill("#FFFFFF");
    // Borde izquierdo de color
    doc.rect(x, y, 5, height).fill(color);
    // Borde general
    doc.rect(x, y, width, height).lineWidth(0.5).stroke("#CCCCCC");

    // Icono Sexo
    const icon = person.ge === "MASCULINO" ? "M" : "F";
    doc.fillColor("#333333").fontSize(14).text(icon, x + 12, y + 10);

    // Tipo (Titular, Padre, etc.)
    doc.fillColor(color).font("Helvetica-Bold").fontSize(8)
       .text(person.tipo || "FAMILIAR", x + 35, y + 12);

    // Nombres (Permitir salto de línea)
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(9);
    doc.text(`${person.nom}`, x + 12, y + 30, { 
        width: 140, 
        align: 'left',
        lineBreak: true 
    });

    // Apellidos (Debajo del nombre, calculando si el nombre ocupó 1 o 2 líneas)
    // Para simplificar, forzamos posición fija pero permitimos que fluya si PDFKit lo maneja, 
    // pero aquí reseteamos Y para mantener orden visual estricto en tarjetas pequeñas.
    // Una estrategia mejor es imprimir apellidos en una zona fija inferior.
    doc.font("Helvetica").fontSize(8).fillColor("#444444");
    doc.text(`${person.ap} ${person.am}`, x + 12, y + 48, { 
        width: 140, 
        align: 'left',
        height: 20,
        ellipsis: true 
    });

    // Datos extra al pie
    doc.fillColor("#666666").fontSize(7)
       .text(`DNI: ${person.dni}  |  Edad: ${person.edad}`, x + 12, y + 62);
}

// --- Funciones para el Dashboard (Estadísticas) ---

// Dibuja un gráfico de dona (porcentaje)
function drawDonutChart(doc, x, y, radius, percentage, color, label, subLabel) {
    // Círculo base (gris claro)
    doc.lineWidth(5).strokeColor("#EEEEEE");
    doc.circle(x, y, radius).stroke();

    // Arco de progreso
    if (percentage > 0) {
        const startAngle = -90;
        const endAngle = (percentage * 360) - 90;
        doc.lineWidth(5).strokeColor(color);
        // PDFKit dibuja arcos, necesitamos calcular coordenadas o usar path
        // Aproximación visual simple: usar lineCap round
        doc.path(`M ${x} ${y - radius} A ${radius} ${radius} 0 ${percentage > 0.5 ? 1 : 0} 1 ${x + radius * Math.cos(endAngle * Math.PI / 180)} ${y + radius * Math.sin(endAngle * Math.PI / 180)}`)
           .stroke();
    }

    // Texto Central
    doc.fillColor(COLORS.TEXT_MAIN).font("Helvetica-Bold").fontSize(12)
       .text(`${Math.round(percentage * 100)}%`, x - 15, y - 5, { width: 30, align: 'center' });
    
    // Etiquetas debajo
    doc.fillColor(COLORS.TEXT_MAIN).fontSize(9).font("Helvetica-Bold")
       .text(label, x - 30, y + radius + 10, { width: 60, align: 'center' });
    doc.fillColor(COLORS.TEXT_LIGHT).fontSize(7).font("Helvetica")
       .text(subLabel, x - 30, y + radius + 20, { width: 60, align: 'center' });
}

// Dibuja iconos de personas vectoriales
function drawPeopleIcons(doc, x, y, count, color) {
    const iconSize = 12;
    const spacing = 16;
    const maxIcons = 10; // Límite visual
    
    for(let i = 0; i < Math.min(count, maxIcons); i++) {
        const currentX = x + (i * spacing);
        // Cabeza
        doc.circle(currentX, y, 3).fill(color);
        // Cuerpo
        doc.path(`M ${currentX} ${y+3} L ${currentX} ${y+10} M ${currentX-3} ${y+5} L ${currentX+3} ${y+5} M ${currentX} ${y+10} L ${currentX-3} ${y+16} M ${currentX} ${y+10} L ${currentX+3} ${y+16}`)
           .lineWidth(1.5).stroke(color);
    }
    if (count > maxIcons) {
        doc.fillColor(COLORS.TEXT_LIGHT).fontSize(10).text("+", x + (maxIcons * spacing), y);
    }
}

// Dibuja gráfico de barras vertical
function drawBarChart(doc, x, y, width, height, dataPoints) {
    const barWidth = (width / dataPoints.length) - 15;
    const maxVal = Math.max(...dataPoints.map(d => d.value)) || 1;

    // Líneas de fondo
    doc.lineWidth(0.5).strokeColor("#EEEEEE");
    [0, 0.5, 1].forEach(p => {
        const lineY = y + height - (height * p);
        doc.moveTo(x, lineY).lineTo(x + width, lineY).stroke();
    });

    dataPoints.forEach((dp, i) => {
        const barHeight = (dp.value / maxVal) * height;
        const bx = x + (i * (width / dataPoints.length)) + 10;
        const by = y + height - barHeight;

        // Barra
        doc.rect(bx, by, barWidth, barHeight).fill(dp.color);
        
        // Etiqueta eje X
        doc.fillColor(COLORS.TEXT_LIGHT).fontSize(7).font("Helvetica")
           .text(dp.label, bx - 5, y + height + 5, { width: barWidth + 10, align: 'center' });
        
        // Valor encima
        doc.fillColor(COLORS.TEXT_MAIN).fontSize(7).font("Helvetica-Bold")
           .text(dp.value.toString(), bx, by - 10, { width: barWidth, align: 'center' });
    });
}

// Dibuja gráfico de área simulado
function drawAreaChart(doc, x, y, width, height, dataPoints) {
    const maxVal = Math.max(...dataPoints) || 1;
    const stepX = width / (dataPoints.length - 1);
    
    doc.save();
    // Definir el camino del área
    doc.moveTo(x, y + height); // Inicio abajo izquierda
    
    const points = [];
    dataPoints.forEach((val, i) => {
        const px = x + (i * stepX);
        const py = y + height - ((val / maxVal) * height);
        points.push({x: px, y: py});
        if (i === 0) doc.lineTo(px, py);
        else doc.lineTo(px, py); // Podría usar curveTo para suavizar, pero lineTo es más seguro sin control points
    });

    doc.lineTo(x + width, y + height); // Fin abajo derecha
    doc.lineTo(x, y + height); // Cerrar
    doc.fillOpacity(0.3).fill(COLORS.PATERNA); // Relleno azul suave
    
    // Dibujar línea superior
    doc.restore();
    doc.lineWidth(2).strokeColor(COLORS.PATERNA);
    doc.moveTo(points[0].x, points[0].y);
    for(let i = 1; i < points.length; i++) {
        doc.lineTo(points[i].x, points[i].y);
    }
    doc.stroke();

    // Etiquetas
    const labels = ["Directa", "Paterna", "Materna", "Extendida"];
    labels.forEach((l, i) => {
        if(i < points.length) {
            doc.fillColor(COLORS.TEXT_LIGHT).fontSize(6)
               .text(l, x + (i * stepX) - 20, y + height + 5, { width: 40, align: 'center' });
        }
    });
}

// --- Endpoints ---

app.get("/consultar-arbol", async (req, res) => {
    const dni = req.query.dni;
    if (!dni) return res.status(400).json({ error: "DNI requerido" });
    try {
        const response = await axios.get(`${ARBOL_GENEALOGICO_API_URL}?dni=${dni}`);
        const data = response.data?.result?.person;
        if (!data) return res.status(404).json({ error: "No encontrado" });

        res.json({
            dni: data.dni,
            nombres: `${data.nom} ${data.ap} ${data.am}`,
            estado: "GENERADO",
            archivo: { url: `${API_BASE_URL}/descargar-arbol-pdf?dni=${dni}` }
        });
    } catch (e) { res.status(500).send("Error API"); }
});

app.get("/descargar-arbol-pdf", async (req, res) => {
    const dni = req.query.dni;
    try {
        const response = await axios.get(`${ARBOL_GENEALOGICO_API_URL}?dni=${dni}`);
        const data = response.data?.result;
        if (!data) return res.status(404).send("Sin datos");

        const doc = new PDFDocument({ margin: 0, size: "LETTER" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=Arbol_${dni}.pdf`);
        doc.pipe(res);

        const grupos = clasificarFamilia(data.coincidences);
        const p = data.person;

        // --- PÁGINA 1: PORTADA Y FAMILIA DIRECTA ---
        
        // Cabecera Principal
        drawHeader(doc, "REPORTE GENEALOGICO PROFESIONAL", 0);
        
        // Datos de Persona Consultada
        doc.rect(MARGIN_X, 80, CONTENT_WIDTH, 120).fill(COLORS.BG_LIGHT).stroke(COLORS.DIRECTA);
        doc.fillColor(COLORS.DIRECTA).font("Helvetica-Bold").fontSize(18).text("PERSONA CONSULTADA", MARGIN_X + 20, 100);
        doc.fontSize(22).text(`${p.nom} ${p.ap} ${p.am}`, MARGIN_X + 20, 125, { width: CONTENT_WIDTH - 40, align: 'left' });
        doc.fontSize(12).fillColor("#444444").text(`DNI: ${p.dni}-${p.dv}  |  Sexo: ${p.ge}  |  Nacimiento: ${p.fn}  |  Edad: ${p.edad} años`, MARGIN_X + 20, 155);

        // Leyenda (Ajustada para que quepa el texto largo)
        doc.rect(MARGIN_X, 220, CONTENT_WIDTH, 60).lineWidth(1).stroke("#EEE");
        doc.fontSize(10).fillColor("#333").text("LEYENDA VISUAL:", MARGIN_X + 15, 230);
        
        const leyendas = [
            { c: COLORS.DIRECTA, t: "Familia Directa" },
            { c: COLORS.PATERNA, t: "Familia Paterna" },
            { c: COLORS.MATERNA, t: "Familia Materna" },
            { c: COLORS.POLITICA, t: "Familia Ext./Polít." } // Texto abreviado o ajustado
        ];
        
        // Renderizar leyenda con mejor espaciado
        const legendItemWidth = 125;
        leyendas.forEach((l, i) => {
            const lx = MARGIN_X + 15 + (i * legendItemWidth);
            doc.rect(lx, 250, 10, 10).fill(l.c);
            doc.fillColor("#555").fontSize(9).text(l.t, lx + 15, 251, { width: 110, align: 'left' });
        });

        // Sección Familia Directa
        doc.fillColor(COLORS.DIRECTA).fontSize(14).font("Helvetica-Bold").text("FAMILIA DIRECTA", MARGIN_X, 310);
        let currentY = 330;
        let currentX = MARGIN_X;
        
        grupos.directa.forEach((fam, i) => {
            if(i > 0 && i % 3 === 0) { currentX = MARGIN_X; currentY += 85; } // +85 para dar espacio a tarjetas más altas
            drawPersonCard(doc, currentX, currentY, fam, COLORS.DIRECTA);
            currentX += 180;
        });

        // --- PÁGINA 2: RAMA PATERNA ---
        doc.addPage();
        drawHeader(doc, "RAMA GENEALOGICA PATERNA", 0);
        currentY = 80; currentX = MARGIN_X;
        
        grupos.paterna.forEach((fam, i) => {
            if(i > 0 && i % 3 === 0) { currentX = MARGIN_X; currentY += 85; }
            if(currentY > 680) { doc.addPage(); drawHeader(doc, "RAMA PATERNA (Cont.)", 0); currentY = 80; }
            drawPersonCard(doc, currentX, currentY, fam, COLORS.PATERNA);
            currentX += 180;
        });

        // --- PÁGINA 3: RAMA MATERNA ---
        doc.addPage();
        drawHeader(doc, "RAMA GENEALOGICA MATERNA", 0);
        currentY = 80; currentX = MARGIN_X;
        
        grupos.materna.forEach((fam, i) => {
            if(i > 0 && i % 3 === 0) { currentX = MARGIN_X; currentY += 85; }
            if(currentY > 680) { doc.addPage(); drawHeader(doc, "RAMA MATERNA (Cont.)", 0); currentY = 80; }
            drawPersonCard(doc, currentX, currentY, fam, COLORS.MATERNA);
            currentX += 180;
        });

        // --- PÁGINA 4: DASHBOARD ESTADÍSTICO (REDISEÑADO) ---
        doc.addPage();
        
        // Fondo blanco (default)
        // 1. Cabecera estilo Dashboard
        doc.rect(MARGIN_X, 40, CONTENT_WIDTH, 80).fill("#EBF5FB"); // Fondo azul muy claro para el título
        doc.fillColor(COLORS.DIRECTA).font("Helvetica-Bold").fontSize(26).text("Datos y Estadísticas", MARGIN_X + 20, 55);
        doc.fillColor(COLORS.TEXT_LIGHT).fontSize(10).font("Helvetica")
           .text("Resumen visual de la composición familiar procesada. Los gráficos muestran la distribución por género, volumen de datos y segmentación por edad.", MARGIN_X + 20, 90, { width: CONTENT_WIDTH - 40 });

        // Preparar Datos
        const total = data.quantity;
        const hombres = data.coincidences.filter(f => f.ge === "MASCULINO").length;
        const mujeres = data.coincidences.filter(f => f.ge === "FEMENINO").length;
        
        const menores = data.coincidences.filter(f => f.edad < 18).length;
        const adultos = data.coincidences.filter(f => f.edad >= 18 && f.edad < 60).length;
        const mayores = data.coincidences.filter(f => f.edad >= 60).length;

        // --- FILA 1: Widgets (Círculos e Iconos) ---
        const ROW1_Y = 140;
        const WIDGET_HEIGHT = 120;
        
        // Tarjeta 1: Crecimiento / Género (2 Donas)
        doc.rect(MARGIN_X, ROW1_Y, 200, WIDGET_HEIGHT).fill(COLORS.WHITE).stroke("#EEEEEE");
        drawDonutChart(doc, MARGIN_X + 50, ROW1_Y + 50, 25, hombres/total, COLORS.PATERNA, "Hombres", `${hombres} regs`);
        drawDonutChart(doc, MARGIN_X + 150, ROW1_Y + 50, 25, mujeres/total, COLORS.MATERNA, "Mujeres", `${mujeres} regs`);

        // Tarjeta 2: Iconos de Personas
        doc.rect(MARGIN_X + 210, ROW1_Y, 150, WIDGET_HEIGHT).fill(COLORS.WHITE).stroke("#EEEEEE");
        drawPeopleIcons(doc, MARGIN_X + 225, ROW1_Y + 40, total, COLORS.MATERNA);
        doc.fillColor(COLORS.TEXT_MAIN).fontSize(9).text("Total Familiares", MARGIN_X + 225, ROW1_Y + 70, { width: 120, align: 'center' });
        doc.fontSize(18).font("Helvetica-Bold").text(total.toString(), MARGIN_X + 225, ROW1_Y + 85, { width: 120, align: 'center' });

        // Tarjeta 3: Barra de Progreso (Simulada) / Info
        doc.rect(MARGIN_X + 370, ROW1_Y, 162, WIDGET_HEIGHT).fill(COLORS.WHITE).stroke("#EEEEEE");
        doc.fillColor(COLORS.TEXT_MAIN).fontSize(10).text("Integridad de Datos", MARGIN_X + 385, ROW1_Y + 30);
        // Barra fondo
        doc.rect(MARGIN_X + 385, ROW1_Y + 50, 130, 10).fill("#EEEEEE").rx(5);
        // Barra progreso (fijo al 100% o calculado)
        doc.rect(MARGIN_X + 385, ROW1_Y + 50, 130, 10).fill(COLORS.MATERNA).rx(5);
        doc.fillColor(COLORS.TEXT_MAIN).fontSize(14).text("100%", MARGIN_X + 480, ROW1_Y + 30);
        doc.fontSize(8).fillColor(COLORS.TEXT_LIGHT).text("Registros verificados con RENIEC", MARGIN_X + 385, ROW1_Y + 70, { width: 130 });

        // --- FILA 2: Gráficos Grandes ---
        const ROW2_Y = 280;
        const CHART_HEIGHT = 150;

        // Gráfico 1: Área (Distribución familiar)
        doc.rect(MARGIN_X, ROW2_Y, 260, CHART_HEIGHT + 40).fill(COLORS.WHITE); // Fondo
        doc.fillColor(COLORS.TEXT_MAIN).fontSize(10).font("Helvetica-Bold").text("Distribución por Vínculo", MARGIN_X + 10, ROW2_Y + 20);
        
        const dataArea = [
            grupos.directa.length,
            grupos.paterna.length,
            grupos.materna.length,
            grupos.extendida.length
        ];
        drawAreaChart(doc, MARGIN_X + 20, ROW2_Y + 50, 220, 100, dataArea);

        // Gráfico 2: Barras (Edad)
        doc.rect(MARGIN_X + 270, ROW2_Y, 262, CHART_HEIGHT + 40).fill(COLORS.WHITE);
        doc.fillColor(COLORS.TEXT_MAIN).fontSize(10).font("Helvetica-Bold").text("Rangos de Edad", MARGIN_X + 280, ROW2_Y + 20);
        
        const dataBar = [
            { label: "< 18", value: menores, color: COLORS.MATERNA },
            { label: "18-60", value: adultos, color: COLORS.PATERNA },
            { label: "> 60", value: mayores, color: COLORS.ACCENT }
        ];
        drawBarChart(doc, MARGIN_X + 290, ROW2_Y + 50, 220, 100, dataBar);

        // Footer Disclaimer
        doc.fontSize(8).fillColor("#999999").font("Helvetica-Oblique")
           .text("Este reporte estadístico se genera automáticamente basado en las coincidencias encontradas.", MARGIN_X, 500, { width: CONTENT_WIDTH, align: "center" });

        doc.end();
    } catch (e) { 
        console.error(e);
        res.status(500).send("Error generando PDF"); 
    }
});

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
