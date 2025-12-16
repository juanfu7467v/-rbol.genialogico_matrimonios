/**
 * @fileoverview Implementación de la función para generar una imagen de Árbol Genealógico
 * usando la librería 'canvas' de Node.js.
 */
import {
    createCanvas,
    loadImage
} from 'canvas';
import {
    v4 as uuidv4
} from 'uuid'; // Necesario para IDs únicos en el mock

// --- CONSTANTES DE CONFIGURACIÓN DEL DIBUJO ---
const CANVAS_WIDTH_ARBOL = 900;
const MARGIN = 30;
const HEADER_HEIGHT = 80;
const FONT_FAMILY = 'Arial, sans-serif'; // Usamos una fuente genérica
const BACKGROUND_COLOR = '#FFFFFF'; // Fondo blanco
const COLOR_TITLE = '#333333'; // Color para títulos
const COLOR_TEXT = '#444444'; // Color para texto principal
const COLOR_SECONDARY_TEXT = '#999999'; // Color para pie de página

// Configuración de Nodos/Cajas
const TREE_NODE_WIDTH = 180;
const TREE_NODE_HEIGHT = 60;
const HORIZONTAL_SPACING = 30; // Espacio entre nodos de la misma capa
const VERTICAL_SPACING = 80; // Espacio vertical entre capas (del borde inferior de una al borde superior de la otra)
const NODE_PADDING = 10;
const LINE_THICKNESS = 3;

// --- DATOS DE LEYENDA (Colores por Parentesco) ---
const legendData = [{
    text: 'Principal',
    color: '#007BFF'
}, // Azul
{
    text: 'Cónyuge/Pareja',
    color: '#FFC107'
}, // Amarillo
{
    text: 'Hijo/Hija',
    color: '#28A745'
}, // Verde
{
    text: 'Hermano/Hermana',
    color: '#6F42C1'
}, // Púrpura
{
    text: 'Padre/Madre',
    color: '#DC3545'
}, // Rojo
{
    text: 'Abuelo/Abuela',
    color: '#17A2B8'
}, // Celeste
{
    text: 'Tío/Tía',
    color: '#FD7E14'
}, // Naranja
{
    text: 'Primo/Prima',
    color: '#E83E8C'
}, // Rosa
];

/**
 * Función auxiliar para dibujar un nodo individual (caja con texto).
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Object} node - Datos del nodo.
 * @param {number} x - Posición X de la esquina superior izquierda.
 * @param {number} y - Posición Y de la esquina superior izquierda.
 * @param {string} color - Color del borde y conexión del nodo.
 */
function drawTreeNode(ctx, node, x, y, color) {
    const radius = 8; // Radio de las esquinas redondeadas
    const textColor = COLOR_TEXT;

    // 1. Dibujar la caja de fondo (relleno blanco)
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.beginPath();
    ctx.roundRect(x, y, TREE_NODE_WIDTH, TREE_NODE_HEIGHT, radius);
    ctx.fill();

    // 2. Dibujar el borde (color del parentesco)
    ctx.strokeStyle = color;
    ctx.lineWidth = LINE_THICKNESS;
    ctx.beginPath();
    ctx.roundRect(x, y, TREE_NODE_WIDTH, TREE_NODE_HEIGHT, radius);
    ctx.stroke();

    // 3. Dibujar el texto principal (Nombre)
    ctx.fillStyle = textColor;
    ctx.font = `bold 14px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    // Centrado vertical y horizontal
    ctx.fillText(
        node.nombre || 'Desconocido',
        x + TREE_NODE_WIDTH / 2,
        y + TREE_NODE_HEIGHT / 2 - 8
    );

    // 4. Dibujar el texto secundario (Parentesco, si no es el principal)
    if (node.parentesco && node.parentesco.toLowerCase() !== 'principal') {
        ctx.font = `italic 12px ${FONT_FAMILY}`;
        ctx.fillStyle = color; // Usar el color del parentesco para destacar
        ctx.fillText(
            `(${node.parentesco})`,
            x + TREE_NODE_WIDTH / 2,
            y + TREE_NODE_HEIGHT / 2 + 14
        );
    }
}

/**
 * Función auxiliar para dibujar las líneas de conexión.
 * Conecta los nodos de la capa actual con sus respectivos padres en la capa anterior.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Object[]} currentLayerNodes - Nodos de la capa actual.
 * @param {Object} nodeCenters - Mapa de centros de nodos (ID -> {centerX, centerY}).
 */
function drawConnections(ctx, currentLayerNodes, nodeCenters) {
    ctx.lineWidth = 2; // Líneas más delgadas que el borde
    ctx.lineCap = 'round';

    currentLayerNodes.forEach(node => {
        // En este modelo, asumimos que cada nodo está conectado al nodo principal
        // de la capa superior de la cual desciende (ej: Hijos -> Principal).
        // Para simplificar el dibujo tipo "mapa mental ordenado", conectamos el nodo
        // al centro de la capa inmediatamente superior.
        // **MEJOR ENFOQUE**: Conectar a un punto centralizado que sirva de tronco común.

        const childCenter = nodeCenters[node.id];
        if (!childCenter) return;

        // **Estrategia: Dibujar la línea desde el centro superior del nodo (hijo)
        // hasta un punto intermedio, y luego horizontalmente hasta el tronco de la capa superior.**
        const trunkY = childCenter.topY - VERTICAL_SPACING / 2; // Línea central entre capas

        // 1. Línea vertical desde el centro superior del nodo
        ctx.strokeStyle = node.color || COLOR_TEXT; // Usar color del parentesco/conexión
        ctx.beginPath();
        ctx.moveTo(childCenter.centerX, childCenter.topY); // Centro superior del nodo
        ctx.lineTo(childCenter.centerX, trunkY); // Punto medio (tronco)
        ctx.stroke();
    });
    
    // Si tienes información de padre/madre en los datos, podrías mejorar la conexión:
    // for (const node of currentLayerNodes) {
    //     if (node.parentId) {
    //         const parentCenter = nodeCenters[node.parentId];
    //         const childCenter = nodeCenters[node.id];
    //         if (parentCenter && childCenter) {
    //             ctx.strokeStyle = node.color;
    //             ctx.beginPath();
    //             ctx.moveTo(parentCenter.centerX, parentCenter.bottomY);
    //             ctx.lineTo(parentCenter.centerX, parentCenter.bottomY + VERTICAL_SPACING / 2);
    //             ctx.lineTo(childCenter.centerX, parentCenter.bottomY + VERTICAL_SPACING / 2);
    //             ctx.lineTo(childCenter.centerX, childCenter.topY);
    //             ctx.stroke();
    //         }
    //     }
    // }
}


/**
 * Genera la imagen del Árbol Genealógico.
 * @param {Object} rawDocumento - Documento principal (mock para compatibilidad).
 * @param {Object} principal - El nodo principal.
 * @param {Object[]} familiares - La lista de nodos familiares.
 * @returns {Buffer} El buffer de la imagen PNG.
 */
const generateGenealogyTreeImage = async (rawDocumento, principal, familiares) => {

    const API_NAME = "ARBOL GENEALOGICO";

    // --- 1. PROCESAMIENTO Y AGRUPAMIENTO DE NODOS (Ordenado por Parentesco) ---

    // Agrupamos y asignamos colores
    const allNodes = [principal, ...familiares].map(n => {
        const parentescoKey = n.parentesco.toLowerCase().replace(/[\/áéíóúüñ]/g, '');
        const legendItem = legendData.find(item =>
            item.text.toLowerCase().replace(/[\/áéíóúüñ]/g, '') === parentescoKey
        );
        return {
            ...n,
            color: legendItem ? legendItem.color : COLOR_TEXT,
            id: n.id || uuidv4() // Asegurar que todos tengan ID
        };
    });

    // Definir el orden jerárquico de las capas (esto define el 'mapa mental ordenado')
    const layerOrder = [
        'Abuelo/Abuela', 'Padre/Madre', 'Principal', 'Cónyuge/Pareja',
        'Hermano/Hermana', 'Hijo/Hija', 'Tío/Tía', 'Primo/Prima'
    ];

    // Mapeo de Parentesco a un índice numérico para la agrupación
    const getLayerIndex = (parentesco) => {
        const key = parentesco.replace(/[\/áéíóúüñ]/g, '');
        return layerOrder.findIndex(p => p.replace(/[\/áéíóúüñ]/g, '') === key);
    };

    // Agrupar los nodos en capas
    const groupedLayers = allNodes.reduce((acc, node) => {
        const index = getLayerIndex(node.parentesco);
        if (index >= 0) {
            if (!acc[index]) {
                acc[index] = {
                    name: layerOrder[index],
                    nodes: []
                };
            }
            acc[index].nodes.push(node);
        }
        return acc;
    }, []);

    // Filtrar capas vacías y aplanar
    let layers = groupedLayers.filter(l => l && l.nodes.length > 0);

    // --- 2. CÁLCULO DINÁMICO DEL ALTO DEL CANVAS ---
    let totalDrawingHeight = 0;

    // Calcular el alto total de dibujo (solo nodos + espaciado)
    layers.forEach((layer, index) => {
        // Sumar la altura de la caja (TREE_NODE_HEIGHT)
        totalDrawingHeight += TREE_NODE_HEIGHT;
        // Sumar el espaciado vertical (VERTICAL_SPACING) después de cada capa, excepto la última
        if (index < layers.length - 1) {
            totalDrawingHeight += VERTICAL_SPACING;
        }
    });


    // Calculamos una ALTURA MÁXIMA TENTATIVA para generar el canvas inicialmente.
    // 300 es un valor seguro para la leyenda y el pie de página
    const TENTATIVE_CANVAS_HEIGHT = MARGIN * 2 + HEADER_HEIGHT + totalDrawingHeight + 300;

    // --- 3. GENERACIÓN DEL CANVAS (Usando el alto tentativo) ---
    const canvas = createCanvas(CANVAS_WIDTH_ARBOL, TENTATIVE_CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // Fondo Blanco Puro
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH_ARBOL, TENTATIVE_CANVAS_HEIGHT);

    // Título
    ctx.fillStyle = COLOR_TITLE;
    ctx.font = `bold 24px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(`Árbol Genealógico: ${principal.nombre}`, CANVAS_WIDTH_ARBOL / 2, MARGIN + 20);

    // Línea separadora
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN, MARGIN + HEADER_HEIGHT - 10);
    ctx.lineTo(CANVAS_WIDTH_ARBOL - MARGIN, MARGIN + HEADER_HEIGHT - 10);
    ctx.stroke();

    let currentY = MARGIN + HEADER_HEIGHT;

    const nodeCenters = {}; // Para guardar la posición de cada nodo
    let previousLayerNodesCenters = [];

    // --- 4. DIBUJO DE NODOS POR CAPA (DE ARRIBA A ABAJO) ---
    layers.forEach((layer, layerIndex) => {
        const numNodes = layer.nodes.length;
        // El ancho total de los nodos en esta capa
        const layerContentWidth = numNodes * TREE_NODE_WIDTH + (numNodes - 1) * HORIZONTAL_SPACING;

        // Calcular la posición X inicial para centrar la capa
        let currentX = (CANVAS_WIDTH_ARBOL - layerContentWidth) / 2;

        // Dibuja el nombre de la capa/categoría (opcional)
        ctx.fillStyle = COLOR_SECONDARY_TEXT;
        ctx.font = `italic 14px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillText(
            `${layer.name} (${numNodes})`,
            MARGIN,
            currentY + 15
        );
        // Ajustamos Y para dejar espacio al título de la capa
        currentY += 25; 

        // Posición Y de la capa (donde comienza el dibujo de la primera caja)
        const layerY = currentY;

        layer.nodes.forEach((node, nodeIndex) => {
            const nodeColor = node.color;

            // Dibuja el nodo (caja)
            drawTreeNode(ctx, node, currentX, layerY, nodeColor);

            // Almacena el centro y bordes del nodo para conexiones/cálculo de alto
            nodeCenters[node.id] = {
                centerX: currentX + TREE_NODE_WIDTH / 2,
                centerY: layerY + TREE_NODE_HEIGHT / 2,
                topY: layerY,
                bottomY: layerY + TREE_NODE_HEIGHT,
                color: nodeColor
            };

            // Mover X para el siguiente nodo
            currentX += TREE_NODE_WIDTH + HORIZONTAL_SPACING;
        });

        // 4b. DIBUJO DE CONEXIONES (Desde esta capa hacia la capa anterior)
        if (layerIndex > 0) {
            drawConnections(ctx, layer.nodes, nodeCenters);
        }
        
        // Mover Y al final de la capa + espaciado vertical para la siguiente
        currentY = layerY + TREE_NODE_HEIGHT + VERTICAL_SPACING;

        // Guardar los centros de la capa actual para la conexión en el siguiente ciclo (opcional, pero útil)
        previousLayerNodesCenters = layer.nodes.map(n => nodeCenters[n.id]);
    });
    
    // El 'currentY' ahora está justo después del espaciado VERTICAL_SPACING de la última capa.
    currentY -= VERTICAL_SPACING / 2; // Retroceder a la mitad del espaciado para la leyenda.
    
    // --- 5. ESPECIFICACIÓN DE COLORES (LEYENDA) ---
    currentY += 20; // Espacio final antes de la leyenda (Separación)

    const legendX = MARGIN;
    let legendY = currentY + 10;
    const LEGEND_BOX_SIZE = 18;
    const LEGEND_LINE_HEIGHT = 28;

    ctx.fillStyle = COLOR_TITLE;
    ctx.font = `bold 18px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText("Leyenda de Parentesco:", legendX, legendY);
    legendY += 10; // Espacio debajo del título de la leyenda

    ctx.font = `14px ${FONT_FAMILY}`;

    // Distribución de la leyenda en 2 columnas
    // Ancho de columna: 50% del área de dibujo menos los márgenes
    const LEGEND_COL_WIDTH = CANVAS_WIDTH_ARBOL / 2 - MARGIN;

    let maxLegendY = legendY;

    legendData.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);

        let itemX = legendX + col * LEGEND_COL_WIDTH;
        // La posición Y se calcula a partir de 'legendY' (base) + el índice de fila.
        let itemY = legendY + (row + 1) * LEGEND_LINE_HEIGHT;

        // Dibujar el cuadro de color (Borde de color sobre fondo blanco)
        ctx.fillStyle = BACKGROUND_COLOR; // Fondo blanco para la caja
        ctx.fillRect(itemX, itemY - LEGEND_BOX_SIZE / 2, LEGEND_BOX_SIZE, LEGEND_BOX_SIZE);
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 4;
        ctx.strokeRect(itemX, itemY - LEGEND_BOX_SIZE / 2, LEGEND_BOX_SIZE, LEGEND_BOX_SIZE);

        // Dibujar el texto
        ctx.fillStyle = COLOR_TEXT;
        ctx.fillText(item.text, itemX + LEGEND_BOX_SIZE + 10, itemY + 5);

        // **ACTUALIZACIÓN CLAVE DE maxLegendY**: Capturamos la posición Y más baja
        maxLegendY = Math.max(maxLegendY, itemY + 5);
    });
    
    currentY = maxLegendY; // Actualizamos el puntero Y con el final de la leyenda

    // 6. Pie de Página
    // Utilizamos la última posición de la leyenda (currentY) + un margen de separación
    const footerY = currentY + 20 + MARGIN / 2; 

    ctx.fillStyle = COLOR_SECONDARY_TEXT;
    ctx.font = `14px ${FONT_FAMILY}`;
    
    // Texto de Fuente (Izquierda)
    ctx.textAlign = 'left';
    ctx.fillText(`Fuente: ${API_NAME}`, MARGIN, footerY);
    
    // Texto de Generación (Derecha)
    ctx.textAlign = 'right';
    ctx.fillText(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, CANVAS_WIDTH_ARBOL - MARGIN, footerY);

    // 7. Recorte Final (Crea un nuevo canvas del tamaño exacto)
    const FINAL_CANVAS_HEIGHT = footerY + MARGIN; // La posición del texto del pie de página + un margen inferior

    // **ACTUALIZACIÓN CLAVE**: Creamos un nuevo canvas con el tamaño final exacto
    const finalCanvas = createCanvas(CANVAS_WIDTH_ARBOL, FINAL_CANVAS_HEIGHT);
    const finalCtx = finalCanvas.getContext('2d');

    // Copiamos el contenido del canvas tentativo al canvas final
    finalCtx.drawImage(
        canvas,
        0, 0,
        CANVAS_WIDTH_ARBOL, FINAL_CANVAS_HEIGHT,
        0, 0,
        CANVAS_WIDTH_ARBOL, FINAL_CANVAS_HEIGHT
    );

    return finalCanvas.toBuffer('image/png');
};

// --------------------------------------------------------------------------
// --- MOCK DE DATOS Y FUNCIÓN DE PRUEBA (Para demostración) ---
// --------------------------------------------------------------------------

// Datos de prueba (MOCK)
const mockPrincipal = {
    id: 'p1',
    nombre: 'Juan Pérez',
    parentesco: 'Principal',
    genero: 'M'
};

const mockFamiliares = [{
    id: 'f1',
    nombre: 'María García',
    parentesco: 'Cónyuge/Pareja',
    genero: 'F',
    parentId: 'p1'
}, {
    id: 'f2',
    nombre: 'Carlos Pérez',
    parentesco: 'Hijo/Hija',
    genero: 'M',
    parentId: 'p1'
}, {
    id: 'f3',
    nombre: 'Ana Pérez',
    parentesco: 'Hijo/Hija',
    genero: 'F',
    parentId: 'p1'
}, {
    id: 'f4',
    nombre: 'Pedro Pérez',
    parentesco: 'Padre/Madre',
    genero: 'M'
}, {
    id: 'f5',
    nombre: 'Elena López',
    parentesco: 'Padre/Madre',
    genero: 'F'
}, {
    id: 'f6',
    nombre: 'Luis Pérez',
    parentesco: 'Hermano/Hermana',
    genero: 'M',
    parentId: 'p1'
}, {
    id: 'f7',
    nombre: 'Javier Pérez',
    parentesco: 'Abuelo/Abuela',
    genero: 'M'
}, {
    id: 'f8',
    nombre: 'Rosa Pérez',
    parentesco: 'Abuelo/Abuela',
    genero: 'F'
}, {
    id: 'f9',
    nombre: 'Lucía Pérez',
    parentesco: 'Tío/Tía',
    genero: 'F'
}, {
    id: 'f10',
    nombre: 'Roberto García',
    parentesco: 'Primo/Prima',
    genero: 'M'
}, ];


/**
 * Función principal para ejecutar la prueba y guardar la imagen.
 */
async function runTest() {
    try {
        console.log("Generando la imagen del árbol genealógico...");
        const imageBuffer = await generateGenealogyTreeImage(
            {}, // rawDocumento (mock)
            mockPrincipal,
            mockFamiliares
        );

        // Guardar el buffer en un archivo para verificar (solo para prueba en Node.js)
        const fs = await
        import ('fs/promises');
        await fs.writeFile('arbol_genealogico.png', imageBuffer);

        console.log("✅ Imagen generada exitosamente como 'arbol_genealogico.png'");
        console.log("Tamaño del buffer:", imageBuffer.length, "bytes");
        
        // Aquí podrías ver la imagen que se genera
        // 
        
    } catch (error) {
        console.error("❌ Error al generar la imagen del árbol genealógico:", error);
    }
}

// Descomentar para ejecutar la prueba en un entorno Node.js
// runTest(); 

// Exportamos la función principal
export {
    generateGenealogyTreeImage
};
