
function toLocal(s, mx, my) {
    let cx = s.x + (s.w || 0) / 2;
    let cy = s.y + (s.h || 0) / 2;
    let angle = -(s.rotation || 0);
    let dx = mx - cx;
    let dy = my - cy;
    return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle) + cx,
        y: dx * Math.sin(angle) + dy * Math.cos(angle) + cy
    };
}

function isMouseInShape(s, mx, my) {

    let local = toLocal(s, mx, my);

    if (s.type === 'brush') {
        return local.x >= s.x - 10 && local.x <= s.x + s.w + 10 && local.y >= s.y - 10 && local.y <= s.y + s.h + 10;
    }
    
    if (s.type === 'circle') {
        let r = Math.abs(s.w / 2);
        let dist = Math.sqrt((local.x - (s.x + s.w / 2))**2 + (local.y - (s.y + s.h / 2))**2);
        return dist <= r;
    }
    return local.x >= s.x && local.x <= s.x + s.w && local.y >= s.y && local.y <= s.y + s.h;
}
//triangle uses rectangle bounding box logic
//(mx,my) is mouse pos in canvas coords

function getCorners(s) {
    return [
        { name: 'nw', x: s.x,y: s.y},
        { name: 'ne', x: s.x + s.w, y: s.y},
        { name: 'sw', x: s.x,y: s.y + s.h },
        { name: 'se', x: s.x + s.w, y: s.y + s.h},
    ];
}

function isNearHandle(hx, hy, px, py) {
    return Math.abs(px - hx) <= HANDLE_SIZE + 5 && Math.abs(py - hy) <= HANDLE_SIZE + 5; //handle (hx, hy) and pointer (px, py)
} //buffer




canvas.addEventListener('mousedown', (e) => {

    if (e.target.tagName === 'TEXTAREA') return;

    const pos = getMousePos(e);
    let mouseX = pos.x;
    let mouseY = pos.y;

    const isBrushTool = shapeSelector.value === 'brush' || ['solid', 'dashed', 'dotted'].includes(shapeSelector.value);

    if (isBrushTool) {
        isDrawing = true;
        selectedShape = null; 
        
        let dashPattern = []; 
        if (brushStyle.value === 'dashed') dashPattern = [15, 10];
        else if (brushStyle.value === 'dotted') dashPattern = [2, 8];

        shapes.push({
            type: 'brush', 
            points: [{ x: mouseX, y: mouseY }],
            color: colorPicker.value, 
            lineWidth: parseInt(lineWidth.value), 
            opacity: parseInt(opacitySelector.value), 
            dash: dashPattern, 
            x: mouseX, 
            y: mouseY,
            w: 0, 
            h: 0,
            rotation: 0
        });
        draw();
        return; 
    }

    //only runs if Brush is NOT active
    if (selectedShape) {
        let local = toLocal(selectedShape, mouseX, mouseY);
        let cx = selectedShape.x + selectedShape.w / 2;
        let cy = selectedShape.y + selectedShape.h / 2;

        if (isNearHandle(cx, selectedShape.y - ROTATE_DIST, local.x, local.y)) {
            isRotating = true;
            rotationStartAngle = Math.atan2(mouseY - cy, mouseX - cx);
            shapeStartRotation = selectedShape.rotation || 0;
            return;
        }

        let corners = getCorners(selectedShape);
        for (let c of corners) {
            if (isNearHandle(c.x, c.y, local.x, local.y)) {
                resizingCorner = c.name;
                shapeBeforeResize = { x: selectedShape.x, y: selectedShape.y, w: selectedShape.w, h: selectedShape.h };
                return;
            }
        }
    }

    let clicked = [...shapes].reverse().find(s => isMouseInShape(s, mouseX, mouseY));
    if (clicked) {
        selectedShape = clicked;
        isDragging = true;
        dragOffsetX = mouseX - selectedShape.x;
        dragOffsetY = mouseY - selectedShape.y;
        draw();
        return;
    }

    if (shapeSelector.value === 'addImage') {
        addImage(mouseX, mouseY); 
        return;
    }

    if (shapeSelector.value === 'triangle') {
        tempTriPoints.push({ x: mouseX, y: mouseY });
        if (tempTriPoints.length === 3) {
            shapes.push({
                type: 'triangle',
                points: [...tempTriPoints],
                color: colorPicker.value,
                lineWidth: parseInt(lineWidth.value),
                opacity: parseInt(opacitySelector.value),
                x: Math.min(...tempTriPoints.map(p => p.x)), //adding bounds for selection
                y: Math.min(...tempTriPoints.map(p => p.y)),
                w: Math.max(...tempTriPoints.map(p => p.x)) - Math.min(...tempTriPoints.map(p => p.x)),
                h: Math.max(...tempTriPoints.map(p => p.y)) - Math.min(...tempTriPoints.map(p => p.y))
            });
            tempTriPoints = [];
        }
        draw();
        return;
    }

    if (shapeSelector.value !== 'select') {
        selectedShape = null;
        isDrawing = true;
        startX = mouseX;
        startY = mouseY;
    }

    draw();
});


canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePos(e);
    let mouseX = pos.x;
    let mouseY = pos.y;

    if (isRotating && selectedShape) {
        let cx = selectedShape.x + selectedShape.w / 2;
        let cy = selectedShape.y + selectedShape.h / 2;
        let currentAngle = Math.atan2(mouseY - cy, mouseX - cx);
        selectedShape.rotation = shapeStartRotation + (currentAngle - rotationStartAngle);
        draw();
        return;
    } 
    
    if (resizingCorner && selectedShape) {
        let local = toLocal(selectedShape, mouseX, mouseY);
        let s = selectedShape;
        let snap = shapeBeforeResize;

        if (resizingCorner === 'se') {
            s.w = Math.max(10, local.x - snap.x); //min size 10x10
            s.h = Math.max(10, local.y - snap.y);
        } else if (resizingCorner === 'sw') {
            s.x = local.x;
            s.w = Math.max(10, (snap.x + snap.w) - local.x);
            s.h = Math.max(10, local.y - snap.y);
        } else if (resizingCorner === 'ne') {
            s.y = local.y;
            s.w = Math.max(10, local.x - snap.x);
            s.h = Math.max(10, (snap.y + snap.h) - local.y);
        } else if (resizingCorner === 'nw') {
            s.x = local.x; s.y = local.y;
            s.w = Math.max(10, (snap.x + snap.w) - local.x);
            s.h = Math.max(10, (snap.y + snap.h) - local.y);
        }

        //just find ratio and scale!!!!

        if (s.points && oldW !== 0 && oldH !== 0) {
            let scaleX = s.w / oldW;
            let scaleY = s.h / oldH;
            s.points.forEach(p => {
                p.x = s.x + (p.x - oldX) * scaleX;
                p.y = s.y + (p.y - oldY) * scaleY;
            });
        }

        draw();
        return;
    }

    if (isDragging && selectedShape) {
        let dx = mouseX - dragOffsetX - selectedShape.x;
        let dy = mouseY - dragOffsetY - selectedShape.y;

        selectedShape.x += dx;
        selectedShape.y += dy;

        if (selectedShape.points) {
            selectedShape.points.forEach(p => {
                p.x += dx;
                p.y += dy;
            });
        }
        draw();
        return;
    }

    if (!isDrawing) return;

    const isBrushTool = shapeSelector.value === 'brush' || ['solid', 'dashed', 'dotted'].includes(shapeSelector.value);

        if (isBrushTool) {
            shapes[shapes.length - 1].points.push({ x: mouseX, y: mouseY });
            draw(); 
            return;
        } 
        else {
            draw(); 

        ctx.globalAlpha = parseInt(opacitySelector.value) / 100;
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = parseInt(lineWidth.value);
        ctx.setLineDash([]); 

        if (shapeSelector.value === 'rect') ctx.strokeRect(startX, startY, mouseX - startX, mouseY - startY);
        else if (shapeSelector.value === 'circle') {
            let r = Math.sqrt((mouseX - startX)**2 + (mouseY - startY)**2);
            ctx.beginPath();
            ctx.arc(startX, startY, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        else if (shapeSelector.value === 'square') {
            let side = Math.max(Math.abs(mouseX - startX), Math.abs(mouseY - startY));
            ctx.strokeRect(mouseX < startX ? startX - side : startX, mouseY < startY ? startY - side : startY, side, side);
        }
        else if (shapeSelector.value === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(startX + (mouseX - startX) / 2, startY); 
            ctx.lineTo(mouseX, mouseY); 
            ctx.lineTo(startX, mouseY); 
            ctx.closePath();
            ctx.stroke();
        }        
        else if (shapeSelector.value === 'text') {
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, mouseX - startX, mouseY - startY);
        }
        ctx.globalAlpha = 1.0; 
    }
});

canvas.addEventListener('mouseup', (e) => {

    const pos = getMousePos(e);
    let mouseX = pos.x;
    let mouseY = pos.y;

    if (isDrawing && shapeSelector.value === 'brush') {
        let lastStroke = shapes[shapes.length - 1];
        if (lastStroke.points.length > 0) {
            let xs = lastStroke.points.map(p => p.x);
            let ys = lastStroke.points.map(p => p.y);
        
            let minX = Math.min(...lastStroke.points.map(p => p.x));
            let maxX = Math.max(...lastStroke.points.map(p => p.x));
            let minY = Math.min(...lastStroke.points.map(p => p.y));
            let maxY = Math.max(...lastStroke.points.map(p => p.y));

            lastStroke.x = minX;
            lastStroke.y = minY;
            lastStroke.w = maxX - minX;
            lastStroke.h = maxY - minY;}

            
    }

    if (isDrawing && !['brush','text', 'select', 'addImage'].includes(shapeSelector.value)) {
        
        
        let dash = (brushStyle.value === 'dashed') ? [15, 10] : (brushStyle.value === 'dotted') ? [2, 8] : [];

        let newShape = {
            type: shapeSelector.value, color: colorPicker.value, lineWidth: parseInt(lineWidth.value),
            opacity: parseInt(opacitySelector.value), 
            rotation: 0, dash: dash, x: startX, y: startY, w: mouseX - startX, h: mouseY - startY
        };

        if (newShape.type === 'square') {
            let s = Math.max(Math.abs(newShape.w), Math.abs(newShape.h));
            newShape.x = mouseX < startX ? startX - s : startX; newShape.y = mouseY < startY ? startY - s : startY;
            newShape.w = s; newShape.h = s;
        } else if (newShape.type === 'circle') {
            let r = Math.sqrt((mouseX - startX)**2 + (mouseY - startY)**2);
            newShape.x = startX - r; newShape.y = startY - r; newShape.w = r * 2; newShape.h = r * 2;
        } else if (newShape.type === 'triangle') {
            newShape.x = Math.min(startX, mouseX); newShape.y = Math.min(startY, mouseY);
            newShape.w = Math.abs(mouseX - startX); newShape.h = Math.abs(mouseY - startY);
        } 
        
        shapes.push(newShape);
        selectedShape = newShape;
    }

    
    if (isDrawing && shapeSelector.value === 'text') {
        const pos = getMousePos(e);
        let mouseX = pos.x;
        let mouseY = pos.y;
        
        addText(startX, startY, mouseX - startX, mouseY - startY);

    }

    isDrawing = isRotating = resizingCorner = isDragging = false;
    draw();
});



canvas.addEventListener('dblclick',(e) => {
        const pos = getMousePos(e);
        let mouseX = pos.x;
        let mouseY = pos.y;

    let clickedText = [...shapes].reverse().find (s => s.type === 'text' && isMouseInShape(s, mouseX, mouseY));
    //reverse shallow copy only!

    if (clickedText){
        shapes = shapes.filter(s => s !== clickedText);

        editText(clickedText);
        draw();
    }


});

