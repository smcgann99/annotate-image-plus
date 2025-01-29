module.exports = function(RED) {
    "use strict";
    const { createCanvas, loadImage, registerFont } = require("canvas");
    const path = require("path");

    let fontLoaded = false;
    function loadFont() {
        if (!fontLoaded) {
            registerFont(path.join(__dirname,'./SourceSansPro-Regular.ttf'), { family: 'Source Sans Pro' });
            fontLoaded = true;
        }
    }

    function calculateLineWidth(height) {
        const referenceHeight = 700;
        const referenceWidth = 14;
        let width = Math.round((height / referenceHeight) * referenceWidth);
        return Math.max(width, 1);
    }

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

        this.on("input", function(msg) {
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
                        ctx.lineJoin = 'bevel';
                        ctx.textBaseline = "middle";
                        

                        const annotationPromises = msg.annotations.map(async function(annotation) {
                            let x, y, r, w, h, textX, textY, fontSize;
                            annotation.fontSize = annotation.fontSize || config.fontSize;
                            annotation.minFontSize = annotation.minFontSize || defaultMinFontSize;
                            annotation.textBackground = annotation.textBackground || defaultTextBackground;
                            annotation.lineWidth = annotation.lineWidth || config.lineWidth;
                            annotation.fontColor = annotation.fontColor || defaultFontColor;

                            if (!annotation.type && annotation.bbox) {
                                annotation.type = 'rect';
                            }

                            function calculateFontSize(text, maxWidth) {
                                ctx.font = `${defaultMinFontSize}px 'Source Sans Pro'`;
                                const textWidth = ctx.measureText(text).width;
                                const scaleFactor = maxWidth / textWidth;
                                return Math.ceil(Math.max(defaultMinFontSize * scaleFactor, defaultMinFontSize));
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
                                    ctx.beginPath();
                                    ctx.rect(x, y, w, h);
                                    ctx.strokeStyle = annotation.stroke || defaultStroke;
                                    ctx.lineWidth = annotation.lineWidth || calculateLineWidth(h);
                                    ctx.stroke();
                                    

                                    if (annotation.label) {
                                        fontSize = annotation.fontSize || calculateFontSize(annotation.label, w);
                                        ctx.font = `${fontSize}px 'Source Sans Pro'`;
                                        
                                        if (annotation.labelLocation) {
                                            if (annotation.labelLocation === "top") {
                                                textY = Math.max(y - Math.round(0.2 * fontSize), 0);
                                            } else if (annotation.labelLocation === "bottom") {
                                                textY = Math.min(y + h + Math.round(1.2 * fontSize), img.height);
                                            }
                                        } else {
                                            textY = (y - Math.round(0.2 * fontSize) < 0 || y - Math.round(0.2 * fontSize) < img.height - (y + h + Math.round(1.2 * fontSize))) ? y + h + Math.round(1.2 * fontSize) : y - Math.round(0.2 * fontSize);
                                        }

                                        ctx.fillStyle = annotation.textBackground; // Set background color
                                        ctx.fillRect(x, textY - fontSize, ctx.measureText(annotation.label).width, fontSize); // Draw background rectangle
                                        ctx.fillStyle = annotation.fontColor; // Set text color
                                        textY = textY - fontSize + fontSize / 2;
                                        ctx.fillText(annotation.label, x, textY); // Draw text
                                    }
                                    break;
                                case 'circle':
                                    if (annotation.bbox) {
                                        x = annotation.bbox[0] + annotation.bbox[2] / 2;
                                        y = annotation.bbox[1] + annotation.bbox[3] / 2;
                                        r = Math.min(annotation.bbox[2], annotation.bbox[3]) / 2;
                                    } else {
                                        x = annotation.x;
                                        y = annotation.y;
                                        r = annotation.r;
                                    }
                                    ctx.beginPath();
                                    ctx.arc(x, y, r, 0, Math.PI * 2);
                                    ctx.strokeStyle = annotation.stroke || defaultStroke;
                                    ctx.lineWidth = annotation.lineWidth || calculateLineWidth(r * 2);
                                    ctx.stroke();

                                    if (annotation.label) {
                                        fontSize = annotation.fontSize || calculateFontSize(annotation.label, 2 * r, annotation.minFontSize);
                                        ctx.font = `${fontSize}px 'Source Sans Pro'`;
                                        
                                        if (annotation.labelLocation) {
                                            if (annotation.labelLocation === "top") {
                                                textY = Math.max(y - r - Math.round(0.2 * fontSize), 0);
                                            } else if (annotation.labelLocation === "bottom") {
                                                textY = Math.min(y + r + Math.round(1.2 * fontSize), img.height);
                                            }
                                        } else {
                                            textY = (y - r - Math.round(0.2 * fontSize) < 0 || y - r - Math.round(0.2 * fontSize) < img.height - (y + r + Math.round(1.2 * fontSize))) ? y + r + Math.round(1.2 * fontSize) : y - r - Math.round(0.2 * fontSize);
                                        }

                                        ctx.fillStyle = annotation.textBackground; // Set background color
                                        ctx.fillRect(x - r, textY - fontSize, ctx.measureText(annotation.label).width, fontSize); // Draw background rectangle
                                        ctx.fillStyle = annotation.fontColor; // Set text color
                                        textY = textY - fontSize + fontSize / 2;
                                        ctx.fillText(annotation.label, x-r, textY); // Draw text
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
            node.error(err,errorText, msg);
            msg.error = err;
            if (originalPayload) {
                msg.payload = originalPayload;
            }
            node.send(msg); 
        }
    }

    RED.nodes.registerType("annotate-canvas", AnnotateNode);
};
