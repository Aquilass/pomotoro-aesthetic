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

        // 修改相機位置和朝向
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);

        // 修改軌道控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 10;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI / 2;

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
        // 創建計時器主體
        const bodyGeometry = new THREE.CylinderGeometry(1, 1, 0.3, 32);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xCCCCCC,
            flatShading: false
        });
        this.timerBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.timerBody.rotation.x = 0;
        this.scene.add(this.timerBody);

        this.createDialFace();
        this.createHandAndKnob();
        this.createButtons();
    }

    createDialFace() {
        // 表面
        const faceGeometry = new THREE.CircleGeometry(0.9, 64);
        
        // 灰色背景 - 調整材���設置
        const greyMaterial = new THREE.MeshPhongMaterial({
            color: 0xEEEEEE,
            side: THREE.DoubleSide,
            depthWrite: true,
            depthTest: true
        });
        this.greyFace = new THREE.Mesh(faceGeometry, greyMaterial);
        this.greyFace.position.y = 0.15;
        this.greyFace.rotation.x = -Math.PI / 2;
        this.timerBody.add(this.greyFace);

        // 恢復添加刻度
        this.createTicks();

        // 綠色進度扇形
        const segments = 360; // 改為360段，每段代表1度
        this.progressSegments = [];
        
        for (let i = 0; i < segments; i++) {
            const startAngle = -Math.PI / 2 + (i / segments) * Math.PI * 2;
            const segmentGeometry = new THREE.CircleGeometry(0.9, 1, 
                startAngle,
                (1 / segments) * Math.PI * 2);
            const segmentMaterial = new THREE.MeshPhongMaterial({
                color: 0x4CAF50,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
                depthTest: true,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.y = 0.151;
            segment.rotation.x = -Math.PI / 2;
            segment.visible = false;
            this.progressSegments.push(segment);
            this.timerBody.add(segment);
        }
    }

    createTicks() {
        // 創建刻度
        for (let i = 0; i < 60; i++) {
            const isMainTick = i % 5 === 0;
            const tickGeometry = new THREE.BoxGeometry(
                0.02,  // 寬度更細
                0.01,  // 厚度
                isMainTick ? 0.15 : 0.08  // 主刻度更長
            );
            const tickMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x333333,
                transparent: false,
                opacity: 1
            });
            const tick = new THREE.Mesh(tickGeometry, tickMaterial);
            
            const angle = (i / 60) * Math.PI * 2;
            const radius = 0.8;
            
            tick.position.x = Math.sin(angle) * radius;
            tick.position.z = Math.cos(angle) * radius;
            tick.position.y = 0.152;
            tick.rotation.y = angle;
            
            this.timerBody.add(tick);
        }
    }

    createHandAndKnob() {
        // 指針組
        this.handGroup = new THREE.Group();
        this.handGroup.position.y = 0.152;
        this.timerBody.add(this.handGroup);

        // 指針
        const handGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.7);
        const handMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333
        });
        this.hand = new THREE.Mesh(handGeometry, handMaterial);
        this.hand.position.z = 0.35;
        this.hand.rotation.z = -Math.PI / 2;
        this.handGroup.add(this.hand);

        // 中心圓點
        const centerGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32);
        const centerMaterial = new THREE.MeshPhongMaterial({ color: 0xE0C080 });
        this.center = new THREE.Mesh(centerGeometry, centerMaterial);
        this.center.rotation.x = Math.PI / 2;
        this.handGroup.add(this.center);
    }

    createButtons() {
        // 頂部按鈕
        const buttonGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 32);
        const greenButtonMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4CAF50,
            emissive: 0x4CAF50,
            emissiveIntensity: 0
        });
        const orangeButtonMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFF9800,
            emissive: 0xFF9800,
            emissiveIntensity: 0
        });

        this.buttons.green = new THREE.Mesh(buttonGeometry, greenButtonMaterial);
        this.buttons.green.position.set(-0.5, 0.2, 0);
        this.buttons.green.userData.isButton = true;
        this.buttons.green.userData.buttonType = 'green';
        this.timerBody.add(this.buttons.green);

        this.buttons.orange = new THREE.Mesh(buttonGeometry, orangeButtonMaterial);
        this.buttons.orange.position.set(0.5, 0.2, 0);
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
        // 環境���
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
        
        this.handGroup.rotation.z = angle + Math.PI / 2;
        
        let normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
        this.currentTime = (1 - (normalizedAngle / (Math.PI * 2))) * this.duration;
    }

    onMouseUp() {
        this.isDragging = false;
    }

    handleButtonClick(buttonType) {
        switch (buttonType) {
            case 'green':
                this.isRunning = !this.isRunning;
                if (this.isRunning) {
                    this.lastTime = Date.now();
                    this.buttons.green.material.emissiveIntensity = 0.5;
                } else {
                    this.buttons.green.material.emissiveIntensity = 0;
                }
                break;
                
            case 'orange':
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
        const angle = Math.PI / 2 + (progress * Math.PI * 2);
        
        this.handGroup.rotation.z = angle;
        
        // 更新進度顯示 - 使用精確的進度值
        const totalSegments = this.progressSegments.length;
        const exactProgress = this.currentTime / this.maxDuration;
        const visibleSegments = Math.floor(exactProgress * totalSegments);
        
        this.progressSegments.forEach((segment, index) => {
            segment.visible = index < visibleSegments;
        });

        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        this.timeDisplaySpan.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    initializeProgress() {
        const totalSegments = this.progressSegments.length;
        const initialSegments = Math.floor((this.duration / this.maxDuration) * totalSegments);
        
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
            this.updateHand(); // 每幀都更新進度顯示

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