
function addImage(mx, my) {
    let url = prompt("Paste Image URL (or leave blank for a random one):");
    const urlPattern = /^(https?:\/\/)/;


    if (!url || !urlPattern.test(url)) {
        const randomSeed = Math.floor(Math.random() * 1000);
        url = `https://picsum.photos/200/200?random=${randomSeed}`; //same pic was getting pasted ow
    }

    const img = new Image();
    img.crossOrigin = "anonymous"; 
    
    img.onload = () => {
        const newImg = { 
            type: 'image', 
            img: img, 
            imgSrc: url,
            x: mx - 100, 
            y: my - 100, 
            w: 200, 
            h: 200,
            rotation: 0
        };
        shapes.push(newImg);
        selectedShape = newImg;
        draw();
    };

    img.onerror = () => {
        alert("Failed to load image");
    };

    img.src = url;
}



function addText(x, y, w, h) {
    const input = document.createElement('textarea');

    input.style.zIndex='2000';

    input.style.textAlign = 'center';
    input.style.position = 'fixed';
    input.style.left = x + 'px';
    input.style.top = y + 'px';
    input.style.width = Math.max(w, 100) + 'px';
    input.style.height = Math.max(h, 40) + 'px';
    
    input.style.color = colorPicker.value;
    input.style.fontSize = lineWidth.value * 5 + 'px';  //using size slider only for font size
    input.style.background = 'transparent';
    input.style.border = '1px dashed #0078d7';
    input.style.outline = 'none';
    
    document.body.appendChild(input);

    input.addEventListener('blur', () => { //called blur cause element loses focus when user clicks away
        if (input.value.trim() !== "") {
            shapes.push({
                type: 'text',
                text: input.value,
                x: x,
                y: y,
                w: input.offsetWidth,
                h: input.offsetHeight,
                size: parseInt(input.style.fontSize),
                color: colorPicker.value,
                opacity: parseInt(opacitySelector.value),
                textAlign:'center'
            });
        }
        input.remove(); 
        draw();
    });
}


function editText(shape) {
    const input = document.createElement('textarea');

    input.style.textAlign = 'center';
    input.style.position = 'fixed';
    input.style.left = shape.x + 'px';
    input.style.top = shape.y + 'px';
    input.style.width = shape.w + 'px';
    input.style.height = shape.h + 'px';
    
    input.style.color = shape.color;
    input.style.fontSize = shape.size + 'px';
    input.value = shape.text; 
    
    input.style.background = 'rgba(255, 255, 255, 0.1)';
    input.style.border = '2px solid #0078d7';
    input.style.outline = 'none';
    input.style.zIndex = '5000';
    
    document.body.appendChild(input);
    
    setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }, 50);

    input.addEventListener('blur', () => {
        if (input.value.trim() !== "") {
            shapes.push({
                ...shape, //orig
                text: input.value,
                w: input.offsetWidth,
                h: input.offsetHeight,
                textAlign:'center'
            });
        }
        input.remove(); 
        draw();
    });
}

