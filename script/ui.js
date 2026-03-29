clearBtn.addEventListener('click', () => {
    if (confirm('Clear everything?')) {
        shapes = [];        
        undoneShapes = [];   
        selectedShape = null;
        draw();            
    }
});



if (localStorage.getItem('theme') === 'dark') { //darkmode
    checkbox.checked = true;
    document.body.classList.add('dark-theme');
}

checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
    
    draw();
});


toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const parent = btn.parentElement;
        const value = btn.getAttribute('data-shape');

        parent.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        
        if (['solid', 'dashed', 'dotted'].includes(value)) {
            brushStyle.value = value; 
            shapeSelector.value = 'brush'; 
        } else {
            if (value === 'text box') shapeSelector.value = 'text';
            else if (value === 'image') shapeSelector.value = 'addImage';
            else shapeSelector.value = value;
            
            tempTriPoints = [];
        }
        draw(); 
    });
});



if (saveBtn) {
    saveBtn.onclick = () => {
        localStorage.setItem('shapeshift_save_data', JSON.stringify(shapes));
        
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Saved!";
        saveBtn.style.background = "#ff5722"; 
        
        setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.style.background = "";
        }, 2000);
    };
}

