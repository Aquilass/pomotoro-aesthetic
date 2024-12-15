import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class PomodoroTimer {
    constructor() {
        // 基本場景設置
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xFFF4D9);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // 修改相機位置，使其正對表盤
        this.camera.position.set(0, 0, 4);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 7;

        // 射線檢測器
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isDragging = false;

        // 計時器狀態
        this.maxDuration = 60 * 60; // 最大60分鐘
        this.duration = 25 * 60; // 預設25分鐘
        this.currentTime = this.duration;
        this.isRunning = false;
        this.timeScale = 1;

        // 添加按鈕狀態
        this.buttons = {
            green: null,
            orange: null
        };

        this.createTimeDisplay();
        this.createTimer();
        this.addLights();
        this.setupEventListeners();
        this.animate();
    }

    createTimer() {
        // 創建計時器主體 - 方形
        const bodyGeometry = new THREE.BoxGeometry(2, 2, 0.5);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            flatShading: false
        });
        this.timerBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        // 不需要旋轉時鐘本體，因為相機已經正對它
        this.scene.add(this.timerBody);

        this.createDialFace();
        this.createHandAndKnob();
        this.createButtons();
    }

    createDialFace() {
        // 表面
        const faceGeometry = new THREE.CircleGeometry(0.9, 64);
        const greyMaterial = new THREE.MeshPhongMaterial({
            color: 0xEEEEEE,
            side: THREE.DoubleSide,
            depthWrite: true,
            depthTest: true
        });
        this.greyFace = new THREE.Mesh(faceGeometry, greyMaterial);
        this.greyFace.position.z = 0.251;
        this.timerBody.add(this.greyFace);

        // 創建刻度
        this.createTicks();

        // 綠色進度扇形 - 從12點開始順時針填充
        const segments = 360;
        this.progressSegments = [];
        
        for (let i = 0; i < segments; i++) {
            // 這裡的角度計算是關鍵
            const startAngle = -(i / segments) * Math.PI * 2 + Math.PI / 2;
            const segmentGeometry = new THREE.CircleGeometry(0.9, 1, 
                startAngle,
                -(1 / segments) * Math.PI * 2); // 負值使其順時針
            const segmentMaterial = new THREE.MeshPhongMaterial({
                color: 0x4CAF50,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
                depthTest: true
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.z = 0.252;
            segment.visible = false;
            this.progressSegments.push(segment);
            this.timerBody.add(segment);
        }
    }

    createTicks() {
        for (let i = 0; i < 60; i++) {
            const isMainTick = i % 5 === 0;
            const tickGeometry = new THREE.BoxGeometry(
                0.02,                    // 寬度固定
                isMainTick ? 0.1 : 0.05, // 長度
                0.01                     // 厚度
            );
            const tickMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x333333,
                transparent: false,
                opacity: 1
            });
            const tick = new THREE.Mesh(tickGeometry, tickMaterial);
            
            const angle = (i / 60) * Math.PI * 2;
            const radius = 0.8;
            
            tick.position.set(
                Math.sin(angle) * radius,
                Math.cos(angle) * radius,
                0.251
            );
            
            tick.rotation.z = -angle;
            
            this.timerBody.add(tick);

            // 為主刻度添加數字
            if (isMainTick) {
                // 創建 canvas
                const canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                
                // 設置字體
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 48px Arial'; // 調整字大小
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // 計算分鐘數
                const minutes = i === 0 ? 0 : i;
                ctx.fillText(minutes.toString(), 64, 64);

                // 創建貼圖
                const texture = new THREE.CanvasTexture(canvas);
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                // 使用平面幾何體代替 Sprite
                const textGeometry = new THREE.PlaneGeometry(0.15, 0.15);
                const textMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthWrite: false
                });
                const textMesh = new THREE.Mesh(textGeometry, textMaterial);

                // 設置數字位置
                const textRadius = 0.65;
                const angle = (i / 60) * Math.PI * 2;
                textMesh.position.set(
                    Math.sin(angle) * textRadius,
                    Math.cos(angle) * textRadius,
                    0.252
                );
                
                // 使數字始終朝向正面
                textMesh.rotation.z = -angle;
                
                this.timerBody.add(textMesh);
            }
        }
    }

    createHandAndKnob() {
        // 指針組
        this.handGroup = new THREE.Group();
        this.handGroup.position.z = 0.253;
        this.timerBody.add(this.handGroup);

        // 指針 - 調整長度以對齊刻度
        const handGeometry = new THREE.BoxGeometry(0.8, 0.04, 0.02);
        const handMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333
        });
        this.hand = new THREE.Mesh(handGeometry, handMaterial);
        this.hand.geometry.translate(-0.4, 0, 0);
        
        // 初始指向12點
        this.hand.rotation.z = -Math.PI / 2;
        this.isInitialState = true; // 添加狀態標記
        this.handGroup.add(this.hand);

        // 中心圓點
        const centerGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32);
        const centerMaterial = new THREE.MeshPhongMaterial({ color: 0xE0C080 });
        this.center = new THREE.Mesh(centerGeometry, centerMaterial);
        this.center.rotation.x = Math.PI / 2;
        this.handGroup.add(this.center);

        // 添加初始顯示角度偏移
        this.initialOffset = Math.PI / 2;
    }

    createButtons() {
        // 綠色按鈕 - 放在上方並朝上
        const greenButtonGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.15);
        const greenButtonMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4CAF50,
            emissive: 0x4CAF50,
            emissiveIntensity: 0
        });
        this.buttons.green = new THREE.Mesh(greenButtonGeometry, greenButtonMaterial);
        this.buttons.green.position.set(-0.5, 1.05, 0);
        // 按鈕朝上
        this.buttons.green.rotation.x = 0;
        this.buttons.green.userData.isButton = true;
        this.buttons.green.userData.buttonType = 'green';
        this.timerBody.add(this.buttons.green);

        // 橙色按鈕 - 放在上方並朝上
        const orangeButtonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 32);
        const orangeButtonMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFF9800,
            emissive: 0xFF9800,
            emissiveIntensity: 0
        });
        this.buttons.orange = new THREE.Mesh(orangeButtonGeometry, orangeButtonMaterial);
        this.buttons.orange.position.set(0.5, 1.05, 0);
        this.buttons.orange.rotation.x = 0;
        this.buttons.orange.userData.isButton = true;
        this.buttons.orange.userData.buttonType = 'orange';
        this.timerBody.add(this.buttons.orange);
    }

    createTimeDisplay() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.left = '20px';
        container.style.zIndex = '100';
        container.innerHTML = `
            <div style="background: rgba(255,255,255,0.8); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                <label>設定時間: </label>
                <input type="number" min="1" max="60" value="25" style="width: 60px;"> 分鐘
                <button id="setTime">設定</button>
            </div>
            <div style="background: rgba(255,255,255,0.8); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                <span id="timeDisplay" style="font-size: 24px;">25:00</span>
            </div>
            <div style="background: rgba(255,255,255,0.8); padding: 10px; border-radius: 5px;">
                <label>時間倍率: </label>
                <input type="range" min="1" max="100" value="1" style="width: 100px;">
                <span>1x</span>
            </div>
        `;
        document.body.appendChild(container);

        const timeInput = container.querySelector('input[type="number"]');
        const setTimeButton = container.querySelector('#setTime');
        this.timeDisplaySpan = container.querySelector('#timeDisplay');

        setTimeButton.addEventListener('click', () => {
            const minutes = parseInt(timeInput.value);
            if (minutes >= 1 && minutes <= 60) {
                if (this.isInitialState) {
                    this.hand.rotation.z = Math.PI;
                    this.isInitialState = false;
                }
                this.duration = minutes * 60;
                this.currentTime = this.duration;
                this.isRunning = false;
                this.buttons.green.material.emissiveIntensity = 0;
                this.updateHand();
                this.initializeProgress();
            }
        });

        const slider = container.querySelector('input[type="range"]');
        const label = container.querySelector('span');
        slider.addEventListener('input', (e) => {
            this.timeScale = parseInt(e.target.value);
            label.textContent = `${this.timeScale}x`;
        });
    }

    addLights() {
        // 環境
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // 主要方向光
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(2, 4, 2);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        // 填充光
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-2, 4, -2);
        this.scene.add(fillLight);
    }

    setupEventListeners() {
        // 添加滑鼠事件監聽
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    onMouseDown(event) {
        event.preventDefault();
        
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            if (object.userData.isButton) {
                this.handleButtonClick(object.userData.buttonType);
                return;
            }
            
            if (object.userData.draggable || object.parent.userData.draggable) {
                this.isDragging = true;
                this.isRunning = false;
            }
        }
    }

    onMouseMove(event) {
        if (!this.isDragging) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const angle = Math.atan2(y - centerY, x - centerX);
        
        // 修改角度計算，匹配扇形區域
        let normalizedAngle = (-angle + Math.PI / 2) % (Math.PI * 2);
        if (normalizedAngle > Math.PI) {
            normalizedAngle = Math.PI;
        }
        
        // 設定指針位置，匹配扇形區域
        const timePosition = (this.currentTime / this.maxDuration) * Math.PI * 2;
        this.handGroup.rotation.z = Math.PI / 2 - timePosition;
    }

    onMouseUp() {
        this.isDragging = false;
    }

    handleButtonClick(buttonType) {
        switch (buttonType) {
            case 'green':
                if (this.isInitialState) {
                    this.hand.rotation.z = Math.PI;
                    this.isInitialState = false;
                }
                this.isRunning = !this.isRunning;
                if (this.isRunning) {
                    this.lastTime = Date.now();
                    this.buttons.green.material.emissiveIntensity = 0.5;
                } else {
                    this.buttons.green.material.emissiveIntensity = 0;
                }
                break;
                
            case 'orange':
                if (this.isInitialState) {
                    this.hand.rotation.z = Math.PI;
                    this.isInitialState = false;
                }
                this.isRunning = false;
                this.currentTime = this.duration;
                this.updateHand();
                this.initializeProgress();
                this.buttons.green.material.emissiveIntensity = 0;
                
                this.buttons.orange.material.emissiveIntensity = 0.5;
                setTimeout(() => {
                    this.buttons.orange.material.emissiveIntensity = 0;
                }, 200);
                break;
        }
    }

    updateHand() {
        const progress = this.currentTime / this.duration;
        const maxAngle = Math.PI * 2;
        const timePosition = (this.duration / 3600) * maxAngle;
        
        // 使用原有的角度計算，但加上初始偏移
        const angle = Math.PI / 2 - timePosition * progress;
        
        this.handGroup.rotation.z = angle;
        
        // 更新進度顯示
        const totalSegments = this.progressSegments.length;
        const visibleSegments = Math.floor((this.currentTime / 3600) * totalSegments);
        
        this.progressSegments.forEach((segment, index) => {
            segment.visible = index < visibleSegments;
        });

        // 更新時間顯示
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        this.timeDisplaySpan.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    initializeProgress() {
        const totalSegments = this.progressSegments.length;
        const initialSegments = Math.floor((this.duration / 3600) * totalSegments);
        
        // 設定初始指針位置，加上初始偏移
        const maxAngle = Math.PI * 2;
        const timePosition = (this.duration / 3600) * maxAngle;
        // const initialAngle = Math.PI / 2 - timePosition + this.initialOffset;
        const initialAngle = Math.PI / 2 - timePosition 
        this.handGroup.rotation.z = initialAngle;
        
        this.progressSegments.forEach((segment, index) => {
            segment.visible = index < initialSegments;
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isRunning) {
            const now = Date.now();
            const delta = (now - this.lastTime) / 1000 * this.timeScale;
            this.lastTime = now;

            this.currentTime = Math.max(0, this.currentTime - delta);
            this.updateHand();

            if (this.currentTime <= 0) {
                this.isRunning = false;
                this.buttons.green.material.emissiveIntensity = 0;
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new PomodoroTimer(); 