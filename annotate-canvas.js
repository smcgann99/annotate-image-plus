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

    function AnnotateNode(config) {
        RED.nodes.createNode(this, config);
        this.data       = config.data || "";
        this.dataType   = config.dataType || "msg";
        var node = this;
        const defaultFill = config.fill || "";
        const defaultStroke = config.stroke || "#ffC000";
        const defaultLineWidth = parseInt(config.lineWidth) || 5;
        const defaultFontSize = config.fontSize || 24;
        const defaultFontColor = config.fontColor || "#ffC000";
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

                        msg.annotations.forEach(function(annotation) {
                            ctx.fillStyle = annotation.fill || defaultFill;
                            ctx.strokeStyle = annotation.stroke || defaultStroke;
                            ctx.lineWidth = annotation.lineWidth || defaultLineWidth;
                            let x, y, r, w, h;

                            if (!annotation.type && annotation.bbox) {
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
                                    ctx.beginPath();
                                    ctx.rect(x, y, w, h);
                                    ctx.stroke();

                                    if (annotation.label) {
                                        ctx.font = `${annotation.fontSize || defaultFontSize}px 'Source Sans Pro'`;
                                        ctx.fillStyle = annotation.fontColor || defaultFontColor;
                                        ctx.textBaseline = "top";
                                        ctx.textAlign = "left";

                                        if (annotation.labelLocation) {
                                            if (annotation.labelLocation === "top") {
                                                y = y - (20 + ((defaultLineWidth * 0.5) + Number(defaultFontSize)));
                                                if (y < 0) y = 0;
                                            } else if (annotation.labelLocation === "bottom") {
                                                y = y + (10 + h + ((defaultLineWidth * 0.5) + Number(defaultFontSize)));
                                                ctx.textBaseline = "bottom";
                                            }
                                        } else {
                                            if (y < 0 + (20 + ((defaultLineWidth * 0.5) + Number(defaultFontSize)))) {
                                                y = y + (10 + h + ((defaultLineWidth * 0.5) + Number(defaultFontSize)));
                                                ctx.textBaseline = "bottom";
                                            } else {
                                                y = y - (20 + ((defaultLineWidth * 0.5) + Number(defaultFontSize)));
                                                if (y < 0) y = 0;
                                            }
                                        }
                                        ctx.fillText(annotation.label, x, y);
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
                                    ctx.stroke();

                                    if (annotation.label) {
                                        ctx.font = `${annotation.fontSize || defaultFontSize}px 'Source Sans Pro'`;
                                        ctx.fillStyle = annotation.fontColor || defaultFontColor;
                                        ctx.textBaseline = "middle";
                                        ctx.textAlign = "center";
                                        ctx.fillText(annotation.label, x, y);
                                    }
                                    break;
                            }
                        });

                        const outputBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
                        msg.payload = outputBuffer;
                        node.send(msg);
                    }).catch(err => {
                        node.error(err, msg);
                    });
                } else {
                    node.send(msg);
                }
            } else {
                node.error("Payload not a Buffer", msg);
            }
            return msg;
        });
    }
    RED.nodes.registerType("annotate-canvas", AnnotateNode);
};
