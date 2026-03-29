function handleTouch(e, type) {
    if (e.target.tagName === 'TEXTAREA') return; 
    
    const touch = e.touches[0] || e.changedTouches[0];
    
    const mouseEvent = new MouseEvent(type, {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    
    canvas.dispatchEvent(mouseEvent);
}

window.addEventListener('keydown', (e) => {


    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();

        if (e.shiftKey) {

            if (undoneShapes.length > 0) {
                shapes.push(undoneShapes.pop());
            }
        } else {

            if (shapes.length > 0) {
                undoneShapes.push(shapes.pop());
            }
        }
        
        selectedShape = null; 
        draw();
    }


    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShape) {
            shapes = shapes.filter(s => s !== selectedShape);
            selectedShape = null;
            draw();
        }
    }
});


function handleTouch(e, type) {
    if (e.target.tagName === 'TEXTAREA') return; 
    
    const touch = e.touches[0] || e.changedTouches[0];
    
    const mouseEvent = new MouseEvent(type, {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    
    canvas.dispatchEvent(mouseEvent);
}


canvas.addEventListener('touchstart', (e) => {

    if (shapeSelector.value !== 'select') e.preventDefault(); 
    handleTouch(e, 'mousedown');
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (shapeSelector.value !== 'select') e.preventDefault();
    handleTouch(e, 'mousemove');
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    handleTouch(e, 'mouseup');
});


