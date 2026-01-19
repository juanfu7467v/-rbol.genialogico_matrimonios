const express = require("express");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const cors = require('cors');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración básica
app.use(cors());

// --- CONFIGURACIÓN ---
const ARBOL_GENEALOGICO_API_URL = process.env.ARBOL_GENEALOGICO_API_URL || ""; // Reemplaza si no usas env
// Fuente estándar
const FONT_FAMILY = "sans-serif";

// ==============================================================================
//  UTILIDADES DE DIBUJO (CANVAS)
// ==============================================================================

/**
 * Dibuja una tabla estilo "Lista" (Diseño Imagen 2 - Tabla limpia)
 * Se usa para la Hoja 1 (Paterna) y Hoja 2 (Materna)
 */
const drawFamilyListPage = async (ctx, width, height, title, principal, familiares, side) => {
    // 1. Fondo Blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    const MARGIN = 40;
    let currentY = MARGIN;

    // --- ENCABEZADO ESTILO "Pe RESULTADO" ---
    // Logo simulado o texto
    ctx.fillStyle = "#000000";
    ctx.font = `bold 50px ${FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.fillText("Pe", MARGIN, currentY + 40);
    
    ctx.font = `bold 25px ${FONT_FAMILY}`;
    ctx.fillText("RESULTADO", MARGIN, currentY + 70);

    // Marca de agua / Logo derecha
    ctx.textAlign = "right";
    ctx.font = `bold 20px ${FONT_FAMILY}`;
    ctx.fillText("Consulta pe apk", width - MARGIN, currentY + 40);

    // Línea divisoria decorativa (gris diagonal superior)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(250, 0);
    ctx.lineTo(200, 130);
    ctx.lineTo(0, 130);
    ctx.closePath();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.globalAlpha = 1.0;

    currentY += 100;

    // --- BLOQUE: INFORMACIÓN PRINCIPAL ---
    ctx.textAlign = "left";
    ctx.font = `bold 20px ${FONT_FAMILY}`;
    ctx.fillStyle = "#000000";
    ctx.fillText("Información del Titular", MARGIN, currentY);
    currentY += 15;

    // Tabla de Info Principal
    const infoHeaders = ["DNI", "Nombres", "Apellidos", "Lado Consultado"];
    const infoValues = [
        principal.dni, 
        principal.nombres, 
        `${principal.apellido_paterno} ${principal.apellido_materno}`, 
        side
    ];

    drawSimpleTable(ctx, MARGIN, currentY, width - (MARGIN * 2), infoHeaders, infoValues);
    currentY += 80;

    // --- BLOQUE: LISTA DE FAMILIARES ---
    ctx.font = `bold 20px ${FONT_FAMILY}`;
    ctx.fillStyle = "#000000";
    ctx.fillText(title, MARGIN, currentY);
    currentY += 15;

    // Dibujar Tabla de Familiares
    const tableWidth = width - (MARGIN * 2);
    const rowHeight = 35;
    const colWidths = [0.25, 0.55, 0.20]; // Porcentajes: Parentesco, Nombre, DNI

    // Header Tabla
    ctx.fillStyle = "#F0F0F0"; // Gris claro header
    ctx.fillRect(MARGIN, currentY, tableWidth, rowHeight);
    ctx.strokeStyle = "#CCCCCC";
    ctx.strokeRect(MARGIN, currentY, tableWidth, rowHeight);
    
    ctx.fillStyle = "#333333";
    ctx.font = `bold 14px ${FONT_FAMILY}`;
    ctx.fillText("Parentesco", MARGIN + 10, currentY + 22);
    ctx.fillText("Nombre Completo", MARGIN + (tableWidth * colWidths[0]) + 10, currentY + 22);
    ctx.fillText("DNI", MARGIN + (tableWidth * (colWidths[0] + colWidths[1])) + 10, currentY + 22);

    currentY += rowHeight;

    // Filas
    ctx.font = `13px ${FONT_FAMILY}`;
    
    familiares.forEach((fam) => {
        // Verificar si nos salimos de la hoja
        if (currentY > height - MARGIN) return;

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(MARGIN, currentY, tableWidth, rowHeight);
        ctx.strokeStyle = "#CCCCCC"; // Bordes sutiles
        ctx.strokeRect(MARGIN, currentY, tableWidth, rowHeight);
        
        // Líneas verticales internas
        ctx.beginPath();
        ctx.moveTo(MARGIN + (tableWidth * colWidths[0]), currentY);
        ctx.lineTo(MARGIN + (tableWidth * colWidths[0]), currentY + rowHeight);
        ctx.moveTo(MARGIN + (tableWidth * (colWidths[0] + colWidths[1])), currentY);
        ctx.lineTo(MARGIN + (tableWidth * (colWidths[0] + colWidths[1])), currentY + rowHeight);
        ctx.stroke();

        ctx.fillStyle = "#000000";
        let parentesco = fam.tipo || fam.parentesco || "Familiar";
        let nombre = `${fam.nombres || fam.nom} ${fam.apellido_paterno || fam.ap} ${fam.apellido_materno || fam.am}`;
        let dni = fam.dni || fam.numDoc || "N/A";

        ctx.fillText(parentesco.substring(0, 25), MARGIN + 10, currentY + 22);
        ctx.fillText(nombre.substring(0, 45), MARGIN + (tableWidth * colWidths[0]) + 10, currentY + 22);
        ctx.fillText(dni, MARGIN + (tableWidth * (colWidths[0] + colWidths[1])) + 10, currentY + 22);

        currentY += rowHeight;
    });

    if (familiares.length === 0) {
        ctx.fillStyle = "#666666";
        ctx.textAlign = "center";
        ctx.fillText("No se encontraron registros directos para esta rama familiar.", width / 2, currentY + 30);
    }
};

/**
 * Helper para dibujar la tablita pequeña de información arriba
 */
const drawSimpleTable = (ctx, x, y, width, headers, values) => {
    const rowHeight = 40;
    const colWidth = width / headers.length;

    // Header Row
    ctx.fillStyle = "#F0F0F0";
    ctx.fillRect(x, y, width, rowHeight / 2);
    ctx.strokeStyle = "#CCCCCC";
    ctx.strokeRect(x, y, width, rowHeight / 2);

    // Value Row
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y + (rowHeight/2), width, rowHeight / 2);
    ctx.strokeRect(x, y + (rowHeight/2), width, rowHeight / 2);

    headers.forEach((h, i) => {
        let cx = x + (i * colWidth);
        
        // Texto Header
        ctx.fillStyle = "#333333";
        ctx.font = `12px ${FONT_FAMILY}`;
        ctx.fillText(h, cx + 10, y + 14);

        // Texto Value
        ctx.fillStyle = "#000000";
        ctx.font = `bold 12px ${FONT_FAMILY}`;
        ctx.fillText(values[i] || "-", cx + 10, y + 14 + (rowHeight/2));
        
        // Línea vertical
        if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, y + rowHeight);
            ctx.stroke();
        }
    });
};

/**
 * Dibuja la Hoja 3: Estadísticas y Gráficos (Diseño Imagen 1)
 */
const drawStatsPage = async (ctx, width, height, stats) => {
    // Fondo Blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    
    const MARGIN = 40;
    
    // TÍTULO GRANDE
    ctx.fillStyle = "#222222";
    ctx.textAlign = "right";
    ctx.font = `bold 60px ${FONT_FAMILY}`;
    ctx.fillText("GRÁFICOS", width - MARGIN, 100);
    ctx.fillText("VISUALES", width - MARGIN, 160);

    // --- SECCIÓN IZQUIERDA: LISTA NUMERADA CON FLECHAS ---
    let startY = 100;
    const items = [
        { id: "01", text: "Total de Familiares encontrados en el registro.", color: "#FFF9C4", border: "#FBC02D" }, // Amarillo
        { id: "02", text: `Familia Paterna: ${stats.paternaCount} integrantes.`, color: "#DCEDC8", border: "#AED581" }, // Verde Claro
        { id: "03", text: `Familia Materna: ${stats.maternaCount} integrantes.`, color: "#B2DFDB", border: "#4DB6AC" }, // Verde Agua
        { id: "04", text: `Hombres: ${stats.hombres} | Mujeres: ${stats.mujeres}`, color: "#4DB6AC", border: "#00897B" }  // Verde Oscuro
    ];

    items.forEach((item, index) => {
        const yPos = startY + (index * 110);
        
        // Flecha / Banner de fondo
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.moveTo(MARGIN + 50, yPos);
        ctx.lineTo(width / 2, yPos);         // Recta hasta la mitad
        ctx.lineTo(width / 2 + 30, yPos + 40); // Punta
        ctx.lineTo(width / 2, yPos + 80);    // Abajo
        ctx.lineTo(MARGIN + 50, yPos + 80);
        ctx.fill();

        // Círculo del número
        ctx.beginPath();
        ctx.arc(MARGIN + 50, yPos + 40, 35, 0, 2 * Math.PI);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#000000"; // Borde negro grueso como en el diseño
        ctx.stroke();

        // Número
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.font = `bold 24px ${FONT_FAMILY}`;
        ctx.fillText(item.id, MARGIN + 50, yPos + 48);

        // Texto descriptivo dentro de la flecha
        ctx.textAlign = "left";
        ctx.font = `14px ${FONT_FAMILY}`;
        ctx.fillText(item.text, MARGIN + 100, yPos + 45);
    });

    // --- SECCIÓN DERECHA: GRÁFICO DE BARRAS ---
    // Posicionamos el gráfico debajo del título a la derecha
    const chartX = width / 2 + 50;
    const chartY = 250;
    const chartW = (width / 2) - MARGIN - 50;
    const chartH = 250;

    // Ejes
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#E0E0E0";
    // Líneas horizontales fondo
    for(let i=0; i<=5; i++) {
        let ly = chartY + (i * (chartH/5));
        ctx.beginPath();
        ctx.moveTo(chartX, ly);
        ctx.lineTo(chartX + chartW, ly);
        ctx.stroke();
        
        // Etiquetas Eje Y (dummy values escalados)
        ctx.fillStyle = "#666666";
        ctx.font = "10px Arial";
        ctx.textAlign = "right";
        ctx.fillText((20 - i*4).toString(), chartX - 10, ly + 4);
    }

    // Barras (Datos reales visualizados)
    const maxVal = Math.max(stats.paternaCount, stats.maternaCount, stats.hijosCount || 1);
    const scale = chartH / (maxVal * 1.2); 
    
    const barData = [
        { label: "Paterna", val: stats.paternaCount, color: "#AED581" },
        { label: "Materna", val: stats.maternaCount, color: "#4DB6AC" },
        { label: "Hijos", val: stats.hijosCount, color: "#00897B" }
    ];
    
    const barWidth = chartW / barData.length - 20;

    barData.forEach((bar, i) => {
        let bx = chartX + 10 + (i * (barWidth + 20));
        let bh = bar.val * scale;
        if(bh < 5) bh = 5; // Altura mínima visual
        let by = chartY + chartH - bh;

        ctx.fillStyle = bar.color;
        ctx.fillRect(bx, by, barWidth, bh);
        
        // Etiqueta abajo
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.font = `bold 12px ${FONT_FAMILY}`;
        ctx.fillText(bar.label, bx + barWidth/2, chartY + chartH + 20);
    });

    // --- SECCIÓN INFERIOR: GRÁFICOS DONA (Porcentajes) ---
    const donutsY = height - 150;
    const donutRadius = 50;
    const total = stats.paternaCount + stats.maternaCount + stats.hijosCount + stats.otrosCount || 1;
    
    // Calculamos porcentajes reales
    const p1 = Math.round((stats.paternaCount / total) * 100);
    const p2 = Math.round((stats.maternaCount / total) * 100);
    const p3 = Math.round((stats.hombres / total) * 100); // Ejemplo demográfico
    const p4 = 100 - p3; // Mujeres

    const donuts = [
        { p: p1, label: "% Paterno", color: "#FFF59D" }, // Amarillo
        { p: p2, label: "% Materno", color: "#AED581" }, // Verde claro
        { p: p3, label: "% Hombres", color: "#4DB6AC" }, // Verde medio
        { p: p4, label: "% Mujeres", color: "#00897B" }  // Verde oscuro
    ];

    const donutSpacing = width / 4;

    donuts.forEach((d, i) => {
        let cx = (donutSpacing * i) + (donutSpacing/2);
        
        // Círculo fondo gris
        ctx.beginPath();
        ctx.arc(cx, donutsY, donutRadius, 0, 2*Math.PI);
        ctx.fillStyle = "#F0F0F0";
        ctx.fill();

        // Arco de porcentaje
        let startAngle = -0.5 * Math.PI;
        let endAngle = ((d.p / 100) * 2 * Math.PI) + startAngle;

        ctx.beginPath();
        ctx.arc(cx, donutsY, donutRadius, startAngle, endAngle);
        ctx.lineWidth = 15;
        ctx.strokeStyle = d.color;
        ctx.stroke();

        // Texto porcentaje centro
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.font = `bold 20px ${FONT_FAMILY}`;
        ctx.fillText(`${d.p}%`, cx, donutsY + 8);

        // Etiqueta inferior
        ctx.font = `12px ${FONT_FAMILY}`;
        ctx.fillText(d.label, cx, donutsY + donutRadius + 25);
    });
};

// ==============================================================================
//  LÓGICA DE DATOS
// ==============================================================================

function clasificarFamilia(principal, familiares) {
    const paterna = [];
    const materna = [];
    const hijos = [];
    const otros = [];

    // Normalizar apellidos del principal
    const apePatPrincipal = (principal.apellido_paterno || '').trim().toUpperCase();
    const apeMatPrincipal = (principal.apellido_materno || '').trim().toUpperCase();

    familiares.forEach(fam => {
        const tipo = (fam.tipo || fam.parentesco || '').toUpperCase();
        const apePatFam = (fam.apellido_paterno || fam.ap || '').trim().toUpperCase();
        const apeMatFam = (fam.apellido_materno || fam.am || '').trim().toUpperCase();

        // Lógica de clasificación estricta
        if (tipo.includes("PADRE") || tipo.includes("ABUELO") || tipo.includes("TIO")) {
            // Asumimos paterna si el tipo no especifica "MATERNO" explícitamente, o validamos apellidos
            if (tipo.includes("MATERN")) materna.push(fam);
            else paterna.push(fam);
        } else if (tipo.includes("MADRE") || tipo.includes("ABUELA") || tipo.includes("TIA")) {
             if (tipo.includes("PATERN")) paterna.push(fam);
             else materna.push(fam);
        } else if (tipo.includes("HIJO") || tipo.includes("HIJA")) {
            hijos.push(fam);
            // Los hijos suelen ir en la hoja que tenga espacio, o se pueden poner en "Paterna" como descendencia
            paterna.push(fam); 
        } else if (tipo.includes("HERMANO") || tipo.includes("HERMANA")) {
            // Hermanos comparten ambos, los ponemos en Paterna por defecto o duplicamos si se desea
            paterna.push(fam);
        } else {
            // Clasificación por coincidencia de apellido si el tipo es ambiguo (ej. PRIMO)
            if (apePatFam === apePatPrincipal || apeMatFam === apePatPrincipal) {
                paterna.push(fam);
            } else if (apePatFam === apeMatPrincipal || apeMatFam === apeMatPrincipal) {
                materna.push(fam);
            } else {
                otros.push(fam);
            }
        }
    });

    // Agregar "Otros" a la lista más pequeña para balancear, o a materna por defecto
    otros.forEach(o => materna.push(o));

    return { paterna, materna, hijos };
}

// ==============================================================================
//  ENDPOINT PRINCIPAL: GENERAR PDF
// ==============================================================================

app.get("/descargar-arbol-pdf", async (req, res) => {
    const dni = req.query.dni;

    if (!dni || dni.length !== 8) {
        return res.status(400).send("DNI inválido. Debe tener 8 dígitos.");
    }

    try {
        // 1. OBTENER DATOS
        const response = await axios.get(`${ARBOL_GENEALOGICO_API_URL}?dni=${dni}`);
        const data = response.data?.result;

        if (!data || !data.person) {
            return res.status(404).send("No se encontraron datos para generar el árbol.");
        }

        const principal = data.person;
        // Mapeo básico de datos para asegurar compatibilidad
        const familiares = (data.coincidences || []).map(f => ({
            ...f,
            nombres: f.nombres || f.nom,
            apellido_paterno: f.apellido_paterno || f.ap,
            apellido_materno: f.apellido_materno || f.am,
            dni: f.dni || f.numDoc,
            tipo: f.tipo || f.parentesco
        }));

        // 2. CLASIFICAR DATOS (Paterna vs Materna)
        const { paterna, materna, hijos } = clasificarFamilia(principal, familiares);

        // Estadísticas para la hoja 3
        const stats = {
            paternaCount: paterna.length,
            maternaCount: materna.length,
            hijosCount: hijos.length,
            otrosCount: familiares.length - (paterna.length + materna.length), // Ajuste simple
            hombres: familiares.filter(f => (f.sexo || '').toUpperCase() === 'M' || (f.tipo || '').endsWith('O')).length, // Estimación simple
            mujeres: familiares.filter(f => (f.sexo || '').toUpperCase() === 'F' || (f.tipo || '').endsWith('A')).length
        };
        // Fallback si no hay sexo
        if (stats.hombres === 0 && stats.mujeres === 0) {
            stats.hombres = Math.floor(familiares.length / 2);
            stats.mujeres = familiares.length - stats.hombres;
        }

        // 3. GENERAR DOCUMENTO PDF
        const doc = new PDFDocument({ autoFirstPage: false });
        
        // Configurar respuesta HTTP como Stream PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Arbol_Genealogico_${dni}.pdf`);
        doc.pipe(res);

        // Dimensiones A4 en pixels (aprox para canvas)
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const CANVAS_SCALE = 2; // Doble resolución para mejor calidad
        const C_W = A4_WIDTH * CANVAS_SCALE;
        const C_H = A4_HEIGHT * CANVAS_SCALE;

        // --- HOJA 1: FAMILIA PATERNA ---
        const canvas1 = createCanvas(C_W, C_H);
        const ctx1 = canvas1.getContext("2d");
        await drawFamilyListPage(ctx1, C_W, C_H, "FAMILIA PATERNA", principal, paterna, "Rama Paterna");
        
        doc.addPage({ size: 'A4' });
        doc.image(canvas1.toBuffer(), 0, 0, { width: A4_WIDTH, height: A4_HEIGHT });

        // --- HOJA 2: FAMILIA MATERNA ---
        const canvas2 = createCanvas(C_W, C_H);
        const ctx2 = canvas2.getContext("2d");
        await drawFamilyListPage(ctx2, C_W, C_H, "FAMILIA MATERNA", principal, materna, "Rama Materna");

        doc.addPage({ size: 'A4' });
        doc.image(canvas2.toBuffer(), 0, 0, { width: A4_WIDTH, height: A4_HEIGHT });

        // --- HOJA 3: ESTADÍSTICAS Y LEYENDA ---
        const canvas3 = createCanvas(C_W, C_H);
        const ctx3 = canvas3.getContext("2d");
        await drawStatsPage(ctx3, C_W, C_H, stats);

        doc.addPage({ size: 'A4' });
        doc.image(canvas3.toBuffer(), 0, 0, { width: A4_WIDTH, height: A4_HEIGHT });

        // Finalizar PDF
        doc.end();

    } catch (error) {
        console.error("Error generando PDF:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Error interno generando el PDF", det: error.message });
        }
    }
});

// Endpoint JSON original para compatibilidad
app.get("/consultar-arbol", async (req, res) => {
    // ... (Tu lógica existente para JSON)
    // Puedes agregar el link al PDF en la respuesta JSON:
    // "pdf_url": `${process.env.BASE_URL}/descargar-arbol-pdf?dni=${req.query.dni}`
    res.json({ message: "Utiliza /descargar-arbol-pdf?dni=XXXXXXXX para obtener el archivo." });
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});
