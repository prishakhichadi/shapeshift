const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const lineWidth = document.getElementById('lineWidth');
const opacitySelector = document.getElementById('opacity'); 
const clearBtn = document.getElementById('clear');
const themeBtn = document.getElementById('theme-toggle');
let togglebox=document.querySelector(".toggle-box")
let circle=document.querySelector(".circle")
const checkbox = document.getElementById("checkbox");
const toolButtons = document.querySelectorAll('.tool-btn');
const saveBtn = document.getElementById('saveBtn');

let isDrawing = false;
let startX, startY;
let shapeSelector = { value: 'brush' }; 
let brushStyle = { value: 'solid' }; 
let snapshot;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let shapes = [];
let undoneShapes = []; 
let selectedShape = null;
const HANDLE_SIZE = 8; 
const ROTATE_DIST = 30;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizingCorner = null;
let shapeBeforeResize = null;
let isRotating = false;
let rotationStartAngle = 0;
let shapeStartRotation = 0;
let tempTriPoints=[];
const savedData = localStorage.getItem('shapeshift_save_data');


if (savedData) {
    try {
        const parsed = JSON.parse(savedData);
        shapes = parsed.map(s => {
            if (s.type === 'image' && s.imgSrc) {
                const img = new Image();
                img.src = s.imgSrc;
                s.img = img;
                // Redraw once the image actually loads from the URL
                img.onload = () => draw(); 
            }
            return s;
        });
        setTimeout(draw, 100); 
    } catch (e) {
        console.error("Load failed:", e);
    }
}


window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //darkmode

    const isDark = document.body.classList.contains('dark-theme');
    
    ctx.fillStyle = isDark ? '#1e1e1e' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < shapes.length; i++) {
        let s = shapes[i];
        ctx.save();
        
        ctx.globalAlpha = (s.opacity !== undefined) ? s.opacity / 100 : 1.0;

        ctx.lineCap = 'round';   
        ctx.lineJoin = 'round';
        ctx.lineWidth = s.lineWidth || 2;
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;

        if (s.dash && s.dash.length > 0) ctx.setLineDash(s.dash);
        else ctx.setLineDash([]);

        //this is for rot of strokes and triangles (if this works)
        let cx = s.x + (s.w || 0) / 2;
        let cy = s.y + (s.h || 0) / 2;
        ctx.translate(cx, cy);
        ctx.rotate(s.rotation || 0);
        ctx.translate(-cx, -cy);

        if (s.type === 'brush') {
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let j = 1; j < s.points.length; j++) {
                ctx.lineTo(s.points[j].x, s.points[j].y);
            }
            ctx.stroke();
        }

        else if (s.type === 'text') {
            ctx.setLineDash([]); 
            ctx.font = `${s.size}px Inter, sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(s.text, s.x, s.y);
        }


        else if (s.type === 'image') {
            if (s.img && s.img.complete) {
                // If the image is loaded and ready, draw it
                ctx.drawImage(s.img, s.x, s.y, s.w, s.h);
            } else if (s.imgSrc) {
                // If the image object is missing (after refresh), rebuild it
                if (!s.img) {
                    s.img = new Image();
                    s.img.crossOrigin = "anonymous";
                    s.img.src = s.imgSrc;
                    s.img.onload = () => draw(); // Redraw once it's ready
                }
            }
        }

        else if (s.type === 'rect' || s.type === 'square') {
            ctx.strokeRect(s.x, s.y, s.w, s.h);
        }
        else if (s.type === 'circle') {
            ctx.beginPath();
            ctx.arc(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), 0, 2 * Math.PI);
            ctx.stroke();
        }
        else if (s.type === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(s.points[0].x,s.points[0].y);
            ctx.lineTo(s.points[1].x,s.points[1].y);
            ctx.lineTo(s.points[2].x,s.points[2].y);
            ctx.closePath();
            ctx.stroke();

        }    

        ctx.restore();

        if (s === selectedShape) {
            drawHandles(s);
        }
    }

    if (tempTriPoints.length > 0 && shapeSelector.value === 'triangle') {
        ctx.save();
        ctx.strokeStyle = colorPicker.value;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(tempTriPoints[0].x, tempTriPoints[0].y);
        for (let i = 0; i < tempTriPoints.length; i++) {
            ctx.lineTo(tempTriPoints[i].x, tempTriPoints[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]); //reset dash for the points

        tempTriPoints.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); 
            ctx.fillStyle = '#0078d7';
            ctx.strokeStyle = '#0078d7';
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
    });

        ctx.restore();
    }

}

function drawHandles(s) {

    let cx = s.x + s.w / 2;
    let cy = s.y + s.h / 2;
    ctx.save();
    ctx.globalAlpha = 1.0; //selection handles should be fully visible always
    ctx.translate(cx, cy);
    ctx.rotate(s.rotation || 0);
    ctx.translate(-cx, -cy);

    //go to centre, rotate PAPER to match shape rotation, move backk
    
    ctx.strokeStyle = '#0078d7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
    
    let corners = getCorners(s);  //j make a fn that returns corners based on shape type, like x,y coords of 4 corners if rect
    for (let c of corners) {
        ctx.fillStyle = 'white';
        ctx.strokeRect(c.x - HANDLE_SIZE/2, c.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.fillRect(c.x - HANDLE_SIZE/2, c.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
    }
    
    ctx.beginPath();
    ctx.moveTo(cx, s.y);
    ctx.lineTo(cx, s.y - ROTATE_DIST);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, s.y - ROTATE_DIST, HANDLE_SIZE/2 + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}


function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}
