const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

let fontLoaded = false;
function loadFont() {
    if (!fontLoaded) {
        registerFont(path.join(__dirname, './SourceSansPro-Regular.ttf'), { family: 'Source Sans Pro' });
        fontLoaded = true;
    }
}

function calculateLineWidth(height) {
    return Math.max(Math.round(height * 0.03), 1);
}

function calculateFontSize(ctx, text, maxWidth, defaultMinFontSize) {
    ctx.font = `${defaultMinFontSize}px 'Source Sans Pro'`;
    const textWidth = ctx.measureText(text).width;
    const scaleFactor = maxWidth / textWidth;
    return Math.ceil(Math.max(defaultMinFontSize * scaleFactor, defaultMinFontSize));
}

function drawLabel(ctx, annotation, x, y, w, h, imgHeight, defaultMinFontSize) {
    const fontSize = annotation.fontSize || calculateFontSize(ctx, annotation.label, w, defaultMinFontSize);
    ctx.font = `${fontSize}px 'Source Sans Pro'`;
    const gap = Math.round(0.2 * fontSize);

    const spaceAbove = y - gap - fontSize;
    const spaceBelow = imgHeight - (y + h + gap + fontSize);

    let textY;
    if (annotation.labelLocation === "top") {
        textY = Math.max(y - gap - fontSize, 0);
    } else if (annotation.labelLocation === "bottom") {
        textY = Math.min(y + h + gap, imgHeight - fontSize);
    } else {
        textY = (spaceAbove < 0 || spaceAbove < spaceBelow) ? y + h + gap : y - gap - fontSize;
        textY = Math.min(textY, imgHeight - fontSize); // Ensure the label fits within the image
    }

    ctx.fillStyle = annotation.textBackground; // Set background color
    ctx.fillRect(x, textY, ctx.measureText(annotation.label).width, fontSize); // Draw background rectangle
    ctx.fillStyle = annotation.fontColor; // Set text color
    ctx.fillText(annotation.label, x, textY + fontSize - fontSize / 2); // Draw text
}

module.exports = function (RED) {
    "use strict";

    function AnnotateNode(config) {
        RED.nodes.createNode(this, config);
        this.data = config.data || "";
        this.dataType = config.dataType || "msg";
        var node = this;
        const defaultStroke = config.stroke || "#ffC000";
        const defaultMinFontSize = config.minFontSize || 10;
        const defaultFontColor = config.fontColor || "#ffC000";
        const defaultTextBackground = config.textBackground || "#ffffff";
        let input = null;
        loadFont();

        this.on("input", function (msg) {
            RED.util.evaluateNodeProperty(node.data, node.dataType, node, msg, (err, value) => {
                if (err) {
                    handleError(err, msg, "Invalid source");
                    return;
                } else {
                    input = value;
                }
            });
            if (Buffer.isBuffer(input)) {
                if (Array.isArray(msg.annotations) && msg.annotations.length > 0) {

                    const buffer = Buffer.from(input);
                    loadImage(buffer).then(img => {
                        const canvas = createCanvas(img.width, img.height);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        ctx.lineJoin = 'round';
                        ctx.textBaseline = "middle";

                        const annotationPromises = msg.annotations.map(async function (annotation) {
                            let x, y, r, w, h;
                            annotation.fontSize = annotation.fontSize || config.fontSize;
                            annotation.textBackground = annotation.textBackground || defaultTextBackground;
                            annotation.lineWidth = annotation.lineWidth || config.lineWidth;
                            annotation.fontColor = annotation.fontColor || defaultFontColor;
                            annotation.stroke = annotation.stroke || defaultStroke;

                            if (!annotation.type) {
                                annotation.type = 'rect';
                            }

                            switch (annotation.type) {
                                case 'rect':
                                    if (annotation.bbox) {
                                        x = annotation.bbox[0];
                                        y = annotation.bbox[1];
                                        w = annotation.bbox[2];
                                        h = annotation.bbox[3];
                                    } else {
                                        x = annotation.x;
                                        y = annotation.y;
                                        w = annotation.w;
                                        h = annotation.h;
                                    }
                                    if (x < 0) {
                                        w += x;
                                        x = 0;
                                    }
                                    if (y < 0) {
                                        h += y;
                                        y = 0;
                                    }
                                    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) {
                                        node.warn(`Invalid rectangle annotation: ${JSON.stringify(annotation)}`);
                                        return;
                                    }
                                    ctx.beginPath();
                                    ctx.rect(x, y, w, h);
                                    ctx.strokeStyle = annotation.stroke || defaultStroke;
                                    ctx.lineWidth = annotation.lineWidth || calculateLineWidth(h);
                                    ctx.stroke();

                                    if (annotation.label) {
                                        drawLabel(ctx, annotation, x, y, w, h, img.height, defaultMinFontSize);
                                    }
                                    break;
                                case 'circle':
                                    if (annotation.bbox) {
                                        x = annotation.bbox[0] + annotation.bbox[2] / 2;
                                        y = annotation.bbox[1] + annotation.bbox[3] / 2;
                                        r = Math.min(annotation.bbox[2], annotation.bbox[3]) / 2;
                                    } else if (!annotation.r) {
                                        x = annotation.x + annotation.w / 2;
                                        y = annotation.y + annotation.h / 2;
                                        r = Math.min(annotation.w, annotation.h) / 2;
                                    } else {
                                        x = annotation.x;
                                        y = annotation.y;
                                        r = annotation.r;
                                    }
                                    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) {
                                        node.warn(`Invalid circle annotation: ${JSON.stringify(annotation)}`);
                                        return;
                                    }
                                    ctx.beginPath();
                                    ctx.arc(x, y, r, 0, Math.PI * 2);
                                    ctx.strokeStyle = annotation.stroke || defaultStroke;
                                    ctx.lineWidth = annotation.lineWidth || calculateLineWidth(r * 2);
                                    ctx.stroke();

                                    if (annotation.label) {
                                        drawLabel(ctx, annotation, x - r, y - r, 2 * r, 2 * r, img.height, defaultMinFontSize);
                                    }
                                    break;
                            }
                        });

                        return Promise.all(annotationPromises).then(() => {
                            const outputBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
                            msg.payload = outputBuffer;
                            node.send(msg);
                        });
                    }).catch(err => {
                        handleError(err, msg, "Image processing error");
                    });
                } else {
                    handleError(new Error("No annotations provided"), msg, "No annotations", input);
                }
            } else {
                handleError(new Error("Input is not a buffer"), msg, "Invalid input");
            }
        });

        function handleError(err, msg, errorText, originalPayload = null) {
            node.error(err, errorText, msg);
            msg.error = err;
            if (originalPayload) {
                msg.payload = originalPayload;
            }
            node.send(msg);
        }
    }

    RED.nodes.registerType("annotate-image-plus", AnnotateNode);
};
