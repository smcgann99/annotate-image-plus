const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

let fontLoaded = false;
function loadFont() {
    if (!fontLoaded) {
        registerFont(path.join(__dirname, './SourceSansPro-Regular.ttf'), { family: 'Source Sans Pro' });
        fontLoaded = true;
    }
}

// Calculate line width based on image height
function calculateLineWidth(height) {
    return Math.max(Math.round(height * 0.03), 1);
}

// Calculate font size based on text width and maximum width
function calculateFontSize(ctx, text, maxWidth, minFontSize) {
    ctx.font = `${minFontSize}px 'Source Sans Pro'`;
    const textWidth = ctx.measureText(text).width;
    const scaleFactor = maxWidth / textWidth;
    return Math.ceil(Math.max(minFontSize * scaleFactor, minFontSize));
}

// Draw label with background and text
function drawLabel(ctx, annotation, x, y, w, h, imgHeight, minFontSize) {
    const fontSize = annotation.fontSize || calculateFontSize(ctx, annotation.label, w, minFontSize);
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
    ctx.globalAlpha = annotation.textBackgroundOpacity; // Set background opacity
    ctx.fillRect(x, textY, ctx.measureText(annotation.label).width, fontSize); // Draw background rectangle
    ctx.fillStyle = annotation.fontColor; // Set text color
    ctx.globalAlpha = annotation.fontColorOpacity; // Set text opacity
    ctx.fillText(annotation.label, x, textY + fontSize - fontSize / 2); // Draw text
}

// Validate hex color format
function validateHexColor(value) {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(value);
}

// Validate opacity value
function validateOpacity(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 1;
}

// Validate number value
function validateNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && Number.isFinite(num);
}

module.exports = function (RED) {
    "use strict";

    function AnnotateNode(config) {
        RED.nodes.createNode(this, config);
        this.data = config.data || "";
        this.dataType = config.dataType || "msg";
        var node = this;

        const stroke = config.stroke || "#ffC000";
        const strokeOpacity = config["stroke-opacity"] || 1;

        const fontColor = config.fontColor || "#ff0000";
        const fontColorOpacity = config["fontColor-opacity"] || 1;

        const textBackground = config.textBackground || "#ffffff";
        const textBackgroundOpacity = config["textBackground-opacity"] || 1;

        const minFontSize = config.minFontSize || 10;

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
                            annotation.type = annotation.type || 'rect';
                            annotation.fontSize = annotation.fontSize || config.fontSize;
                            annotation.lineWidth = annotation.lineWidth || config.lineWidth;

                            if (!annotation.textBackground) {
                                annotation.textBackground = textBackground;
                                annotation.textBackgroundOpacity = textBackgroundOpacity;
                            } else {
                                annotation.textBackgroundOpacity = annotation.textBackgroundOpacity || 1;
                            }

                            if (!annotation.fontColor) {
                                annotation.fontColor = fontColor;
                                annotation.fontColorOpacity = fontColorOpacity;
                            } else {
                                annotation.fontColorOpacity = annotation.fontColorOpacity || 1;
                            }

                            if (!annotation.stroke) {
                                annotation.stroke = stroke;
                                annotation.strokeOpacity = strokeOpacity;
                            } else {
                                annotation.strokeOpacity = annotation.strokeOpacity || 1;
                            }

                            if (!validateHexColor(annotation.fontColor) ||
                                !validateHexColor(annotation.textBackground) ||
                                !validateHexColor(annotation.stroke)) {
                                node.warn({ "invalid color": { ...annotation } });
                                return;
                            }

                            if (!validateOpacity(annotation.textBackgroundOpacity) ||
                                !validateOpacity(annotation.fontColorOpacity) ||
                                !validateOpacity(annotation.strokeOpacity)) {
                                node.warn({ "invalid opacity": { ...annotation } });
                                return;
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
                                    if (!validateNumber(x) || !validateNumber(y) || !validateNumber(w) || !validateNumber(h)) {
                                        node.warn({ "invalid co-ordinates": { ...annotation } });
                                        return;
                                    }
                                    ctx.beginPath();
                                    ctx.rect(x, y, w, h);
                                    ctx.strokeStyle = annotation.stroke;
                                    ctx.globalAlpha = annotation.strokeOpacity;
                                    ctx.lineWidth = annotation.lineWidth || calculateLineWidth(h);
                                    ctx.stroke();

                                    if (annotation.label) {
                                        drawLabel(ctx, annotation, x, y, w, h, img.height, minFontSize);
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
                                    if (!validateNumber(x) || !validateNumber(y) || !validateNumber(r)) {
                                        node.warn({ "invalid co-ordinates": { ...annotation } });
                                        return;
                                    }
                                    ctx.beginPath();
                                    ctx.arc(x, y, r, 0, Math.PI * 2);
                                    ctx.strokeStyle = annotation.stroke;
                                    ctx.globalAlpha = annotation.strokeOpacity;
                                    ctx.lineWidth = annotation.lineWidth || calculateLineWidth(r * 2);
                                    ctx.stroke();

                                    if (annotation.label) {
                                        drawLabel(ctx, annotation, x - r, y - r, 2 * r, 2 * r, img.height, minFontSize);
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

        // Handle errors and send error message
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
