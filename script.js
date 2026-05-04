const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

let cells = [];
let foods = [];

let camX = 0, camY = 0;
let zoom = 1;
let zoomTarget = 1;

let timeScale = 1;

let cellPerClick = 1;
let foodPerClick = 5;

let theme = 0;

let keys = {};

window.addEventListener("keydown", e => {
    let k = e.key.toLowerCase();
    keys[k] = true;

    if(k === "q") zoomTarget *= 1.3;
    if(k === "e") zoomTarget /= 1.3;
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});
function updateCamera(){
    let speed = 10 / zoom;

    if(keys["w"]) camY -= speed;
    if(keys["s"]) camY += speed;
    if(keys["a"]) camX -= speed;
    if(keys["d"]) camX += speed;
}
let foodQueue = [];
let foodSpawnDelay = 0;

class Cell {
    constructor(x,y){
        this.x = x;
        this.y = y;

        this.vx = 0;
        this.vy = 0;

        this.size = 8;
        this.energy = 100;

        this.life = 0;
        this.maxLife = 16200;

        this.target = null;
        this.detectTimer = 0;

        this.dead = false;
    }

    update(){
        if(this.dead) return;

        this.life++;

        let lifeFactor = 1 - (this.life / this.maxLife);
        if(lifeFactor < 0) lifeFactor = 0;

        let speed = 0.5 + lifeFactor;

        if(this.life >= this.maxLife){
            this.dead = true;
            return;
        }

        this.detectTimer--;
        if(this.detectTimer <= 0){

            let delay = 180 + Math.random()*300;

            let closest = null;
            let distMin = Infinity;

            for(let f of foods){
                let d = Math.hypot(f.x-this.x, f.y-this.y);
                if(d < distMin){
                    distMin = d;
                    closest = f;
                }
            }

            if(distMin > this.size*100) delay *= 3;

            this.detectTimer = delay;
            this.target = closest;
        }

        if(this.target){
            let dx = this.target.x - this.x;
            let dy = this.target.y - this.y;
            let d = Math.hypot(dx,dy)+0.01;

            this.vx += (dx/d)*0.04;
            this.vy += (dy/d)*0.04;
        } else {
            this.vx += (Math.random()-0.5)*0.2;
            this.vy += (Math.random()-0.5)*0.2;
        }

        let v = Math.hypot(this.vx,this.vy);
        if(v > speed){
            this.vx = (this.vx/v)*speed;
            this.vy = (this.vy/v)*speed;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.vx *= 0.98;
        this.vy *= 0.98;

        for(let f of foods){
            let d = Math.hypot(f.x-this.x, f.y-this.y);

            if(d < this.size + f.size){
                this.energy += 5;
                this.life = 0;
                f.amount -= 1;
            }
        }

        if(this.energy > 150){
            this.energy *= 0.5;
            cells.push(new Cell(this.x,this.y));
        }

        if(this.life > this.maxLife * 0.8){
            for(let other of cells){
                if(other === this || other.dead) continue;

                if(other.life > other.maxLife * 0.8){

                    let d = Math.hypot(this.x-other.x, this.y-other.y);

                    if(d < this.size*10){
                        this.vx += (other.x-this.x)*0.01;
                        this.vy += (other.y-this.y)*0.01;

                        if(d < this.size*2){
                            this.size *= 1.2;
                            this.life = 0;
                            other.dead = true;
                        }
                    }
                }
            }
        }
    }

    draw(){
        let lifeFactor = this.life / this.maxLife;

        let green = Math.floor(255 * (1-lifeFactor));
        let alpha = lifeFactor > 0.8 ? 0.2 : 1;

        ctx.beginPath();
        ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
        ctx.fillStyle = `rgba(0,${green},100,${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x,this.y,this.size*0.3,0,Math.PI*2);
        ctx.fillStyle = "white";
        ctx.fill();
    }
}
class Food {
    constructor(x,y){
        this.x = x;
        this.y = y;
        this.size = 5;
        this.amount = 20;
    }

    update(){
        if(this.amount <= 0) this.dead = true;
    }

    draw(){
        ctx.fillStyle = `rgba(255,150,0,${this.amount/20})`;
        ctx.beginPath();
        ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
        ctx.fill();
    }
}
let spawnTimer = 0;

function autoSpawn(){
    spawnTimer--;

    if(spawnTimer <= 0 && cells.length > 0){

        spawnTimer = 1800;

        let baseMin = 5;
        let baseMax = 10;

        let scaleSteps = Math.floor(cells.length / 90);
        let multiplier = Math.pow(1.5, scaleSteps);

        let spawnMin = Math.ceil(baseMin * multiplier);
        let spawnMax = Math.ceil(baseMax * multiplier);

        let amount = Math.floor(spawnMin + Math.random() * (spawnMax - spawnMin));

        for(let i = 0; i < amount; i++){

            let c = cells[Math.floor(Math.random()*cells.length)];

            let angle = Math.random()*Math.PI*2;
            let dist = 30 + Math.random()*300;

            foodQueue.push({
                x: c.x + Math.cos(angle)*dist,
                y: c.y + Math.sin(angle)*dist
            });
        }
    }
}
function processFoodQueue(){
    if(foodQueue.length === 0) return;

    foodSpawnDelay--;

    if(foodSpawnDelay <= 0){
        let item = foodQueue.shift();
        foods.push(new Food(item.x, item.y));
        foodSpawnDelay = 60 + Math.random()*60;
    }
}
function drawGrid(){
    let size = 50;

    ctx.strokeStyle = theme===0 ? "#002244" : "#333";

    for(let x=-camX%size; x<canvas.width; x+=size){
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,canvas.height);
        ctx.stroke();
    }

    for(let y=-camY%size; y<canvas.height; y+=size){
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(canvas.width,y);
        ctx.stroke();
    }
}
function drawUI(){
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "right";

    ctx.fillText("Células: " + cells.length, canvas.width - 10, 20);
}
function loop(){

    ctx.fillStyle = theme===0 ? "#111" : "#001a33";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    drawGrid();

    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);

    if(keys["q"]) zoomTarget *= 1.03;
    if(keys["e"]) zoomTarget /= 1.03;

    if(zoomTarget < 0.1) zoomTarget = 0.1;
    if(zoomTarget > 15) zoomTarget = 15;

    zoom += (zoomTarget - zoom) * 0.15;

    ctx.scale(zoom,zoom);
    ctx.translate(-camX,-camY);

    for(let i=0;i<timeScale;i++){
        for(let c of cells) c.update();
        for(let f of foods) f.update();

        cells = cells.filter(c=>!c.dead);
        foods = foods.filter(f=>!f.dead);

        autoSpawn();
        processFoodQueue();
    }

    for(let f of foods) f.draw();
    for(let c of cells) c.draw();

    ctx.restore();

    drawUI()

    updateCamera();

    requestAnimationFrame(loop);
}
loop();

canvas.onclick = e=>{
    let x = (e.clientX-canvas.width/2)/zoom + camX;
    let y = (e.clientY-canvas.height/2)/zoom + camY;

    for(let i=0;i<cellPerClick;i++){
        cells.push(new Cell(x,y));
    }
};

canvas.oncontextmenu = e=>{
    e.preventDefault();

    let x = (e.clientX-canvas.width/2)/zoom + camX;
    let y = (e.clientY-canvas.height/2)/zoom + camY;

    for(let i=0;i<foodPerClick;i++){
        let angle = Math.random()*Math.PI*2;
        let dist = 16 + Math.random()*16;

        foods.push(new Food(
            x + Math.cos(angle)*dist,
            y + Math.sin(angle)*dist
        ));
    }
};

function changeCells(v){
    cellPerClick = Math.max(1, cellPerClick+v);
    cellCount.innerText = cellPerClick;
}

function changeFood(v){
    foodPerClick = Math.max(1, foodPerClick+v);
    foodCount.innerText = foodPerClick;
}

function changeTime(v){
    timeScale = Math.min(25, Math.max(1, timeScale+v));
    timeScaleText.innerText = timeScale+"x";
}

addEventListener("resize",()=>{
    canvas.width = innerWidth;
    canvas.height = innerHeight;
});
