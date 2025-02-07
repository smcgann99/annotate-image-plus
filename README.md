[![Min Node Version](https://img.shields.io/node/v/%40smcgann%2Fnode-red-annotate-image-plus)](https://www.npmjs.com/package/%40smcgann%2Fnode-red-annotate-image-plus)
[![Dependencies](https://img.shields.io/npm/dependency-version/%40smcgann%2Fnode-red-annotate-image-plus/canvas)](https://www.npmjs.com/package/canvas)
[![GitHub license](https://img.shields.io/npm/l/%40smcgann%2Fnode-red-annotate-image-plus)]

@smcgann/node-red-annotate-image-plus
================================

A <a href="http://nodered.org" target="_blank">Node-RED</a> node that can annotate JPEG, PNG or GIF images.

The node can draw rectangles and circles, along with text over the image.
That can be used, for example, to annotate an image with bounding boxes of features
detected in the image by a TensorFlow node.

This node is based on the original node-red-node-annotate-image, and should be a drop in replacement for that node.

**Extra Features**

 * Canvas library typically renders 20 to 40 times faster.
 * Supports more image types - *JPEG, PNG, GIF*.
 * Output is converted to jpeg for better compatibility.
 * Color pickers support opacity.
 * Background box behind labels makes them easier to read.
 * Automatic line width, adjusts to different resolutions.
 * Automatic font size, scales to fit bounding box width.
 * Improved automatic label positioning, based on available space.
 * Default values reduce needed input data.
 * Improved error checking for invalid annotation input.

Pre-requisites
--------------

This node requires the canvas package. By default, pre-built binaries will be downloaded if you're on one of the following platforms:

* macOS x86/64
* macOS aarch64 (aka Apple silicon)
* Linux x86/64 (glibc only)
* Windows x86/64

If you don't have a supported OS or processor architecture, then it requires build tools, which must be installed first.

For Ubuntu / Debian e.g. **Raspberry Pi**

Run the following commands in your Node-RED user directory - typically `~/.node-red`

```bash
sudo apt-get update
```
```bash
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev    
```
***More information, and details for other platforms can be found here <a href="https://www.npmjs.com/package/canvas" target="_blank">Canvas</a>***

Install
-------

Either use the Edit Menu - Manage Palette option to install, or run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
npm install @smcgann/node-red-annotate-image-plus
```

Usage
-----

The image should be passed to the node as a Buffer object in the configured property, default = `msg.payload`.

The annotations are provided in `msg.annotations` and override those set in the node config.

The `Min Font Size` set in config is used as a lower limit for automatic font size.

**You must provide at least `x`,`y`,`w`,`h` or `bbox` other missing values will use defaults.**

**You can select circle without providing `r`, as long as `x`,`y`,`w`,`h` or `bbox` are set.**

Each annotation is an object which can contain the following properties:

 - `type` (*string*) : the type of the annotation - `rect` or `circle` Default: `rect`.
 - `x`/`y` (*number*) : the top-left corner of a `rect` annotation, or the center of a `circle` annotation.
 - `w`/`h` (*number*) : the width and height of a `rect` annotation.
 - `r` (*number*) : the radius of a `circle` annotation.
 - `bbox` (*array*) : this can be used instead of `x`, `y`, `w`, `h` and `r`.
   It should be an array of four values giving the bounding box of the annotation: `[x, y, w, h]`.
 - `label` (*string*) : an optional piece of text to label the annotation with.
 - `stroke` (*string*) : the line color of the annotation. Default: `config Line Color`.
 - `strokeOpacity` (*number*) : opacity of the line `1-100`. Default: `100` or `config Line Color` if stroke not provided.
 - `fontColor` (*string*) : the color of the text used for the label. Default: `config Font Color`.
 - `fontColorOpacity` (*number*) : opacity of the text `1-100`. Default: `100` or `config Font Color` if fontColor not provided.
 - `textBackground` (*string*) : the background color of the text box. Default: `config Background`.
 - `textBackgroundOpacity` (*number*) : opacity of the text box `1-100`. Default: `100` or `config Background` if textBackground not provided.
 - `lineWidth` (*number*) : the stroke width used to draw the annotation. `Automatic if not provided`.
 - `fontSize` (*number*) : the font size to use for the label. `Automatic if not provided`.
 - `labelLocation` (*string*) : the location to place the label, `top` or `bottom`.
   If this property is not set it will default to `automatic` and place where there is more room.

Examples
--------

```javascript
msg.annotations = [ {
    type: "rect",
    x: 10, y: 10, w: 50, h: 50,
    label: "hello",
    textBackground:"#00ffff"
}]
```
```javascript
msg.annotations = [
    {
        type: "circle",
        x: 50, y: 50, r: 20,
        lineWidth: 10
    },
    {
        type: "rect",
        x: 30, y: 30, w: 40, h: 40,
        stroke: "blue"
    }
]
```
```javascript
msg.annotations = [ {
    type: "rect",
    bbox: [ 10, 10, 50, 50]
}]
```
