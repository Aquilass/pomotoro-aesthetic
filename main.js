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

        // 修改相機位置和角度 - 調整為俯視角度
        this.camera.position.set(0.2, 1.5, 4); // 相機位置調整到右上方
        this.camera.lookAt(0, 0, 0);

        // 添加初始旋轉角度設置
        this.INITIAL_ROTATION = {
            X: -Math.PI / 15,  // 向後傾斜 15 度
            Y: -Math.PI / 360,  // 向右旋轉 15 度
            Z: 0
        };

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 7;

        // 修改控制器限制 - 限制在俯視範圍內
        // this.controls.minPolarAngle = Math.PI / 3;     // 60度
        // this.controls.maxPolarAngle = Math.PI / 2.5;   // 約72度
        // this.controls.minAzimuthAngle = -Math.PI / 2;  // -30度
        // this.controls.maxAzimuthAngle = Math.PI / 6;   // 30度

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
            orange: null,
            back: null
        };

        // 添加控制器狀態追踪
        this.controlsEnabled = true;

        // 尺寸常數
        this.SIZE = {
            BOX: {
                WIDTH: 2.55,    // 盒子寬度
                HEIGHT: 2.55,   // 盒子高度
                DEPTH: 1.2     // 盒子厚度
            },
            BUTTONS: {
                GREEN: {
                    WIDTH: 1,
                    HEIGHT: 0.4,
                    DEPTH: 0.65
                },
                ORANGE: {
                    RADIUS: 0.3,
                    HEIGHT: 0.5
                },
                POSITION_Y: 1.15,  // 按鈕Y軸位置
                BACK: {
                    WIDTH: 0.175,
                    HEIGHT: 0.175,
                    DEPTH: 0.05
                }
            },
            HAND: {
                WIDTH: 0.015,    // 指針寬度
                DEPTH: 0.01     // 指針厚度
            }
        };

        // 半徑常數
        this.RADIUS = {
            TICKS: 1.1,
            NUMBERS: 0.95,
            RING: {
                INNER: 0.8,
                OUTER: 1,
                WIDTH: 0.25
            },
            BACKGROUND_RING: {
                INNER: 0.9,  // 背景環形內半徑
                OUTER: 1.2   // 背景環形外半徑
            },
            HAND: 0.9
        };

        // 顏色配置
        this.COLOR_CONFIG = {
            TIMER_GREEN: {
                HEX: 0x517561,
                RGB: '81, 117, 97',
                CSS: '#517561'
            }
        };

        // 顏色
        this.COLORS = {
            BACKGROUND: 0xffc33e,    // 背景色
            BOX: 0xdbcdc7,          // 盒子顏色
            FACE: 0xeeecef,         // 表盤顏色
            PROGRESS: this.COLOR_CONFIG.TIMER_GREEN.HEX,  // 使用配置的顏色
            HAND: 0x202020,         // 指針顏色
            CENTER_KNOB: 0xdeb58a,  // 中心旋鈕顏色
            TICKS: this.COLOR_CONFIG.TIMER_GREEN.CSS,    // 使用配置的顏色
            NUMBERS: this.COLOR_CONFIG.TIMER_GREEN.CSS,  // 使用配置的顏色
            BUTTONS: {
                GREEN: {
                    BASE: 0x517561,
                    EMISSIVE: 0x517561
                },
                ORANGE: {
                    BASE: 0xe7961f,
                    EMISSIVE: 0xe7961f
                },
                BACK: {
                    BASE: {
                        UNMUTED: 0x4CAF50,  // 未靜音時為綠色
                        MUTED: 0xFF5252     // 靜音時為紅色
                    },
                    EMISSIVE: {
                        UNMUTED: 0x4CAF50,
                        MUTED: 0xFF5252
                    }
                }
            },
            RING: {
                BASE: 0xFF9800,
                HOVER: 0xFF9800
            },
            BACKGROUND_RING: 0xeeecef,  // 背景環形區域的顏色（淺灰色）
        };

        // 計算環形區域的半徑
        this.RADIUS.RING.INNER = this.RADIUS.TICKS - this.RADIUS.RING.WIDTH / 2;
        this.RADIUS.RING.OUTER = this.RADIUS.TICKS + this.RADIUS.RING.WIDTH / 2;

        // 更新頻率設置
        this.UPDATES_PER_HOUR = 3600;  // 每小時更新次數
        this.UPDATE_INTERVAL = 1000;    // 更新間隔（毫秒）

        // Z軸位置常數
        this.BUTTONS_OFFSET_BODY_Z_OFFSET = 0.3;
        this.TIMER_BODY_OFFSET = 1;
        this.Z_INDEX = {
            TIMER_BODY: 0,
            BACKGROUND_RING: 0.253 + this.TIMER_BODY_OFFSET,  // 調整到與表盤同層或略高
            GREY_FACE: 0.254 + this.TIMER_BODY_OFFSET,       // 調整表盤位置到背景環形後面
            PROGRESS_SEGMENTS: 0.255 + this.TIMER_BODY_OFFSET,
            HAND_GROUP: 0.256 + this.TIMER_BODY_OFFSET,
            CLICKABLE_RING: 0.257 + this.TIMER_BODY_OFFSET,
            TICKS: 0.258 + this.TIMER_BODY_OFFSET,           // 確保刻度在最上層
            NUMBERS: 0.270 + this.TIMER_BODY_OFFSET,         // 確保數字在最上層
            BUTTONS: {
                GREEN: 0.3 + this.BUTTONS_OFFSET_BODY_Z_OFFSET,    // 綠色按鈕高度
                ORANGE: 0.35 + this.BUTTONS_OFFSET_BODY_Z_OFFSET,  // 橙色按鈕高度
                BACK: 0.5     // 背面按鈕高度
            }
        };

        // 位置偏移常數
        this.POSITION_OFFSET = {
            BUTTONS: {
                X: {
                    GREEN: -0.5,    // 綠色按鈕X軸偏移
                    ORANGE: 0.7,     // 橙色按鈕X軸偏移
                    BACK: 1
                },
                Y: {
                    GREEN: 1.25,     // 綠色按鈕Y軸位置
                    ORANGE: 1.25,    // 橙色按鈕Y軸位置
                    BACK: -1        // 背面按鈕Y軸位置
                },
                Z: {
                    GREEN: 0.9,      // 綠色按鈕Z軸偏移
                    ORANGE: 0.6,     // 橙色按鈕Z軸偏移
                    BACK: 1.25      // 背面按鈕Z軸偏移
                }
            }
        };

        // 閃爍效果設置
        this.FLASH = {
            DURATION: 60000,    // 閃爍持續時間（1分鐘）
            BLINK_INTERVAL: 500, // 閃爍間隔（毫秒）
            INTENSITY: {
                NORMAL: 0,      // 常度
                FLASH: 0.8      // 閃爍亮度
            }
        };

        // 閃爍狀態
        this.isFlashing = false;
        this.flashStartTime = 0;

        // 按鈕狀態
        this.buttonStates = {
            orange: false  // false = 未按下, true = 按下
        };

        // 按鈕效果設置
        this.BUTTON_EFFECTS = {
            UP: {
                Y_OFFSET: 0,
                INTENSITY: 0
            },
            DOWN: {
                Y_OFFSET: -0.05,
                INTENSITY: 0.5
            }
        };

        // 音效設置
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.SOUNDS = {
            TICK: {
                frequency: 1000,    // 滴答聲頻率
                duration: 0.05      // 持續時間（秒）
            },
            ALARM: {
                frequencies: [800, 1000],  // 警報聲頻率
                duration: 0.2,             // 每的持續時間
                interval: 0.3,             // 音與音之間的間隔
                totalDuration: 30000       // 總持續時間（30秒）
            }
        };

        // 上一次播放音效的時間
        this.lastTickTime = 0;
        this.TICK_INTERVAL = 1000; // 音效間隔（毫秒）

        // 儲存當前的警報音效點
        this.currentAlarmNodes = [];

        // 添加靜音狀態
        this.isMuted = false;

        // 添加通知樣式
        const style = document.createElement('style');
        style.textContent = `
            .mute-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
                text-align: center;
            }
            .mute-notification .en {
                font-size: 0.8em;
                opacity: 0.8;
                display: block;
                margin-top: 4px;
            }
            .mute-notification.show {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);

        this.createTimeDisplay();
        this.createTimer();
        this.addLights();
        this.setupEventListeners();
        this.animate();
    }

    createTimer() {
        // 創建圓角矩形形狀，尺寸稍大以容納斜角
        const shape = this.createRoundedRectShape(
            this.SIZE.BOX.WIDTH - 0.1,  // 減小一點以補償斜角
            this.SIZE.BOX.HEIGHT - 0.1,
            0.15  // 較大的圓角半徑
        );

        // 設置擠出參數
        const extrudeSettings = {
            steps: 1,
            depth: this.SIZE.BOX.DEPTH,
            bevelEnabled: true,
            bevelThickness: 0.05,  // 較大的斜角厚度
            bevelSize: 0.05,       // 較大的斜角大小
            bevelOffset: 0,
            bevelSegments: 5
        };

        // 創建幾何體
        const bodyGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // 修改材質，添加透明度
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: this.COLORS.BOX,
            flatShading: false,
            shininess: 30,
            specular: 0x444444,
            metalness: 0.1,
            roughness: 0.5,
            transparent: true,  // 添加透明屬性
            opacity: 1         // 設置透明度為0
        });

        this.timerBody = new THREE.Mesh(bodyGeometry, bodyMaterial);

        // 調整位置使其居中
        this.timerBody.position.z = -this.SIZE.BOX.DEPTH / 2;
        // 設置初始旋轉
        this.timerBody.rotation.x = this.INITIAL_ROTATION.X;
        this.timerBody.rotation.y = this.INITIAL_ROTATION.Y;
        this.timerBody.rotation.z = this.INITIAL_ROTATION.Z;

        this.scene.add(this.timerBody);

        this.createDialFace();
        this.createHandAndKnob();
        this.createButtons();
    }

    createDialFace() {
        // 表面
        const faceGeometry = new THREE.CircleGeometry(0.9, 64);
        const greyMaterial = new THREE.MeshPhongMaterial({
            color: this.COLORS.FACE,
            side: THREE.DoubleSide,
            depthWrite: true,
            depthTest: true,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0
        });
        this.greyFace = new THREE.Mesh(faceGeometry, greyMaterial);
        this.greyFace.position.z = this.Z_INDEX.GREY_FACE;
        this.timerBody.add(this.greyFace);

        // 添加背景環形區域
        const backgroundRingGeometry = new THREE.RingGeometry(
            this.RADIUS.BACKGROUND_RING.INNER,  // 使用設定的內半徑
            this.RADIUS.BACKGROUND_RING.OUTER,  // 使用設定的外半徑
            64    // 分段數
        );
        const backgroundRingMaterial = new THREE.MeshPhongMaterial({
            color: this.COLORS.BACKGROUND_RING,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending
        });
        this.backgroundRing = new THREE.Mesh(backgroundRingGeometry, backgroundRingMaterial);
        this.backgroundRing.position.z = this.Z_INDEX.BACKGROUND_RING;
        this.timerBody.add(this.backgroundRing);

        // 創建刻度
        this.createTicks();

        // 綠色進度扇形 - 從12點開始順時針填充
        const segments = 360;
        this.progressSegments = [];
        
        for (let i = 0; i < segments; i++) {
            // 裡的角度計算是關鍵
            const startAngle = -(i / segments) * Math.PI * 2 + Math.PI / 2;
            const segmentGeometry = new THREE.CircleGeometry(0.9, 1, 
                startAngle,
                -(1 / segments) * Math.PI * 2); // 負值使其順時針
            const segmentMaterial = new THREE.MeshPhongMaterial({
                color: this.COLORS.PROGRESS,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
                depthTest: true,
                emissive: 0xFFFFFF,
                emissiveIntensity: 0
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.z = this.Z_INDEX.PROGRESS_SEGMENTS;
            segment.visible = false;
            this.progressSegments.push(segment);
            this.timerBody.add(segment);
        }

        // 修改可點擊的環形區域
        const ringGeometry = new THREE.RingGeometry(
            this.RADIUS.RING.INNER,
            this.RADIUS.RING.OUTER,
            64
        );
        const ringMaterial = new THREE.MeshPhongMaterial({
            color: this.COLORS.RING.BASE,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });
        this.clickableRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.clickableRing.position.z = this.Z_INDEX.CLICKABLE_RING;
        this.clickableRing.userData.isClickable = true;
        
        // 修改懸停效果
        this.clickableRing.onBeforeRender = () => {
            if (this.isHovering) {
                this.clickableRing.material.opacity = 0.3;  // 懸停時才顯示
                this.clickableRing.material.color.setHex(this.COLORS.RING.HOVER);  // 保持橘色
            } else {
                this.clickableRing.material.opacity = 0;    // 非懸停時完全透明
            }
        };
        
        this.timerBody.add(this.clickableRing);
    }

    createTicks() {
        // 顯示分鐘刻度
        for (let i = 0; i < 60; i++) {
            const isMainTick = i % 5 === 0;
            
            // 只創建分鐘刻度
            const tickGeometry = new THREE.BoxGeometry(
                0.02,                    // 寬固定
                isMainTick ? 0.15 : 0.1, // 主刻度和一般分鐘刻度的長度
                0.01                     // 厚度
            );
            const tickMaterial = new THREE.MeshPhongMaterial({ 
                color: this.COLORS.TICKS,
                transparent: !isMainTick,  // 非主刻度半透明
                opacity: isMainTick ? 1 : 0.5  // 非主刻度設置透明度
            });
            const tick = new THREE.Mesh(tickGeometry, tickMaterial);
            
            const angle = (i / 60) * Math.PI * 2;
            const radius = this.RADIUS.TICKS;
            
            tick.position.set(
                Math.sin(angle) * radius,
                Math.cos(angle) * radius,
                this.Z_INDEX.TICKS
            );
            
            tick.rotation.z = -angle;
            
            this.timerBody.add(tick);

            // 只在5分鐘刻度添加數字
            if (isMainTick) {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                
                // 使用完全不透明的顏色
                ctx.fillStyle = this.COLOR_CONFIG.TIMER_GREEN.CSS;
                ctx.strokeStyle = this.COLOR_CONFIG.TIMER_GREEN.CSS;
                ctx.font = '900 96px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const displayMinutes = i;
                if (displayMinutes % 5 === 0) {
                    ctx.lineWidth = 4;
                    ctx.strokeText(displayMinutes.toString(), 128, 128);
                    ctx.fillText(displayMinutes.toString(), 128, 128);

                    const texture = new THREE.CanvasTexture(canvas);
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.format = THREE.RGBAFormat;
                    
                    const textGeometry = new THREE.PlaneGeometry(0.15, 0.15);
                    const textMaterial = new THREE.MeshLambertMaterial({
                        map: texture,
                        transparent: true,
                        opacity: 1,
                        side: THREE.DoubleSide,
                        depthTest: false,
                        depthWrite: false,
                        color: new THREE.Color(this.COLOR_CONFIG.TIMER_GREEN.HEX),
                        emissive: new THREE.Color(this.COLOR_CONFIG.TIMER_GREEN.HEX),
                        emissiveIntensity: 0.1
                    });

                    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
                    textMesh.renderOrder = 9999;

                    const textRadius = this.RADIUS.NUMBERS;
                    const textAngle = (i / 60) * Math.PI * 2;
                    textMesh.position.set(
                        Math.sin(textAngle) * textRadius,
                        Math.cos(textAngle) * textRadius,
                        this.Z_INDEX.NUMBERS + 0.01
                    );

                    // 補償整體傾斜角度
                    textMesh.rotation.x = -this.INITIAL_ROTATION.X;
                    textMesh.rotation.y = -this.INITIAL_ROTATION.Y;
                    textMesh.rotation.z = 0;

                    this.timerBody.add(textMesh);
                }
            }
        }
    }

    createHandAndKnob() {
        // 指針組
        this.handGroup = new THREE.Group();
        this.handGroup.position.z = this.Z_INDEX.HAND_GROUP;
        this.timerBody.add(this.handGroup);

        // 指針
        const handGeometry = new THREE.BoxGeometry(
            this.RADIUS.HAND,      // 長度
            this.SIZE.HAND.WIDTH,  // 寬度
            this.SIZE.HAND.DEPTH   // 厚度
        );
        const handMaterial = new THREE.MeshPhongMaterial({ 
            color: this.COLORS.HAND
        });
        this.hand = new THREE.Mesh(handGeometry, handMaterial);
        this.hand.geometry.translate(-this.RADIUS.HAND/2, 0, 0);
        this.hand.rotation.z = -Math.PI / 2;
        this.isInitialState = true;
        this.handGroup.add(this.hand);

        // 中心圓點
        const centerGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32);
        const centerMaterial = new THREE.MeshPhongMaterial({ color: this.COLORS.CENTER_KNOB });
        this.center = new THREE.Mesh(centerGeometry, centerMaterial);
        this.center.rotation.x = Math.PI / 2;
        this.handGroup.add(this.center);
    }

    createRoundedRectShape(width, height, radius) {
        const shape = new THREE.Shape();
        
        // 從左上角開始，順時針繪製
        shape.moveTo(-width/2 + radius, -height/2);
        shape.lineTo(width/2 - radius, -height/2);
        shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius);
        shape.lineTo(width/2, height/2 - radius);
        shape.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2);
        shape.lineTo(-width/2 + radius, height/2);
        shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius);
        shape.lineTo(-width/2, -height/2 + radius);
        shape.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2);

        return shape;
    }

    createButtons() {
        // 綠色按鈕 - 使用圓角形
        const greenShape = this.createRoundedRectShape(
            this.SIZE.BUTTONS.GREEN.WIDTH,
            this.SIZE.BUTTONS.GREEN.HEIGHT,
            0.08  // 圓角半徑
        );

        const greenExtrudeSettings = {
            steps: 1,
            depth: this.SIZE.BUTTONS.GREEN.DEPTH,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelOffset: 0,
            bevelSegments: 5
        };

        const greenButtonGeometry = new THREE.ExtrudeGeometry(greenShape, greenExtrudeSettings);
        const greenButtonMaterial = new THREE.MeshPhongMaterial({ 
            color: this.COLORS.BUTTONS.GREEN.BASE,
            emissive: this.COLORS.BUTTONS.GREEN.EMISSIVE,
            emissiveIntensity: 0,
            shininess: 30,
            specular: 0x444444,
            transparent: false  // 確保不是透明的
        });

        this.buttons.green = new THREE.Mesh(greenButtonGeometry, greenButtonMaterial);
        this.buttons.green.position.set(
            this.POSITION_OFFSET.BUTTONS.X.GREEN,
            this.POSITION_OFFSET.BUTTONS.Y.GREEN,
            this.POSITION_OFFSET.BUTTONS.Z.GREEN
        );
        this.buttons.green.rotation.x = Math.PI; // 翻轉使凸起面朝上
        this.buttons.green.userData.isButton = true;
        this.buttons.green.userData.buttonType = 'green';
        this.timerBody.add(this.buttons.green);

        // 橙色按鈕 - 使用圓柱體但添加斜角
        const orangeButtonGeometry = new THREE.CylinderGeometry(
            this.SIZE.BUTTONS.ORANGE.RADIUS,
            this.SIZE.BUTTONS.ORANGE.RADIUS,
            this.SIZE.BUTTONS.ORANGE.HEIGHT,
            32,
            1,
            false,
            0,
            Math.PI * 2
        );
        // 添加斜角
        const orangeEdges = new THREE.EdgesGeometry(orangeButtonGeometry, 30); // 30度閾
        const orangeLineGeometry = new THREE.BufferGeometry();
        orangeLineGeometry.setAttribute('position', orangeEdges.attributes.position);
        
        const orangeButtonMaterial = new THREE.MeshPhongMaterial({ 
            color: this.COLORS.BUTTONS.ORANGE.BASE,
            emissive: this.COLORS.BUTTONS.ORANGE.EMISSIVE,
            emissiveIntensity: 0,
            shininess: 30,
            specular: 0x444444
        });

        this.buttons.orange = new THREE.Mesh(orangeButtonGeometry, orangeButtonMaterial);
        this.buttons.orange.position.set(
            this.POSITION_OFFSET.BUTTONS.X.ORANGE,
            this.POSITION_OFFSET.BUTTONS.Y.ORANGE,
            this.POSITION_OFFSET.BUTTONS.Z.ORANGE
        );
        this.buttons.orange.userData.isButton = true;
        this.buttons.orange.userData.buttonType = 'orange';
        this.timerBody.add(this.buttons.orange);

        // 修改背面按鈕（靜音按鈕）
        const shape = this.createRoundedRectShape(
            this.SIZE.BUTTONS.BACK.WIDTH,
            this.SIZE.BUTTONS.BACK.HEIGHT,
            0.05  // 圓角半徑
        );

        const extrudeSettings = {
            steps: 1,
            depth: this.SIZE.BUTTONS.BACK.DEPTH,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelOffset: 0,
            bevelSegments: 5
        };

        const backButtonGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const backButtonMaterial = new THREE.MeshPhongMaterial({ 
            color: this.COLORS.BUTTONS.BACK.BASE.UNMUTED,
            emissive: this.COLORS.BUTTONS.BACK.EMISSIVE.UNMUTED,
            emissiveIntensity: 0,
            shininess: 30,
            specular: 0x444444
        });

        this.buttons.back = new THREE.Mesh(backButtonGeometry, backButtonMaterial);
        
        // 調整位置和旋轉
        this.buttons.back.position.set(
            this.POSITION_OFFSET.BUTTONS.X.BACK,
            this.POSITION_OFFSET.BUTTONS.Y.BACK,
            this.POSITION_OFFSET.BUTTONS.Z.BACK
        );
        this.buttons.back.rotation.x = Math.PI; // 翻轉使凸起面朝後

        this.buttons.back.userData.isButton = true;
        this.buttons.back.userData.buttonType = 'back';
        this.timerBody.add(this.buttons.back);
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
            <div style="background: rgba(255,255,255,0.8); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                <label>時間倍數: </label>
                <input type="range" min="1" max="100" value="1" style="width: 100px;">
                <span>1x</span>
            </div>
            <div style="background: rgba(255,255,255,0.8); padding: 10px; border-radius: 5px;">
                <button id="muteButton" style="padding: 5px 10px;">
                    <span id="muteIcon">🔊</span> 聲音
                </button>
            </div>
        `;
        document.body.appendChild(container);

        const timeInput = container.querySelector('input[type="number"]');
        const setTimeButton = container.querySelector('#setTime');
        this.timeDisplaySpan = container.querySelector('#timeDisplay');

        setTimeButton.addEventListener('click', () => {
            // 在設定時間時停止警報聲和閃爍
            this.stopAlarmSound();
            this.stopFlashing();
            const minutes = parseInt(timeInput.value);
            if (minutes >= 1 && minutes <= 60) {
                if (this.isInitialState) {
                    this.hand.rotation.z = Math.PI;
                    this.isInitialState = false;
                }
                this.duration = minutes * 60;
                this.currentTime = this.duration;
                this.isRunning = false;

                // 重置綠色按鈕的狀態，但不改變透明度
                this.buttonStates.orange = false;
                this.buttons.green.position.set(
                    this.POSITION_OFFSET.BUTTONS.X.GREEN,
                    this.POSITION_OFFSET.BUTTONS.Y.GREEN,
                    this.POSITION_OFFSET.BUTTONS.Z.GREEN
                );
                this.buttons.green.material.emissiveIntensity = 0;

                // 重置橙色按鈕的位置
                this.buttons.orange.material.transparent = true;
                this.buttons.orange.material.opacity = 1;  // 確保按鈕可見
                this.buttons.orange.position.set(
                    this.POSITION_OFFSET.BUTTONS.X.ORANGE,
                    this.POSITION_OFFSET.BUTTONS.Y.ORANGE,
                    this.POSITION_OFFSET.BUTTONS.Z.ORANGE
                );
                this.buttons.orange.material.emissiveIntensity = 0;

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

        // 添加靜音按鈕事件監聽
        const muteButton = container.querySelector('#muteButton');
        const muteIcon = container.querySelector('#muteIcon');
        muteButton.addEventListener('click', () => {
            this.isMuted = !this.isMuted;
            muteIcon.textContent = this.isMuted ? '🔇' : '🔊';
        });
    }

    addLights() {
        // 環
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
        // 添加鼠事件聽
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
        // 檢測所有可交互物體
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            if (object.userData.isButton) {
                this.handleButtonClick(object.userData.buttonType);
                return;
            }
            
            // 檢查是否點到環形區域
            if (object === this.clickableRing) {
                // 在設定新時間時停止警報聲和閃爍
                this.stopAlarmSound();
                this.stopFlashing();

                // 重置綠色按鈕的狀態和位置
                this.buttonStates.orange = false;
                this.buttons.green.position.set(
                    this.POSITION_OFFSET.BUTTONS.X.GREEN,
                    this.POSITION_OFFSET.BUTTONS.Y.GREEN,
                    this.POSITION_OFFSET.BUTTONS.Z.GREEN
                );
                this.buttons.green.material.emissiveIntensity = 0;

                const point = intersects[0].point;
                const localPoint = this.timerBody.worldToLocal(point.clone());
                const angle = Math.atan2(localPoint.y, localPoint.x);
                let normalizedAngle = (-angle + Math.PI / 2) % (Math.PI * 2);
                if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                
                // 調整吸附角度為30秒間隔 (120份分割)
                const snapAngle = Math.round(normalizedAngle / (Math.PI / 60)) * (Math.PI / 60);
                
                // 計算時間（每個刻度代表30秒）
                const totalSeconds = Math.floor((snapAngle / (Math.PI * 2)) * 3600);
                const snappedSeconds = Math.round(totalSeconds / 30) * 30;
                
                this.duration = Math.min(snappedSeconds, 3600);
                this.currentTime = this.duration;
                
                if (this.isInitialState) {
                    this.hand.rotation.z = Math.PI;
                    this.isInitialState = false;
                }
                this.initializeProgress();
                
                // 標記開始拖動
                this.isDragging = true;
            }
        }
    }

    onMouseMove(event) {
        if (this.isDragging) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            const x = (event.clientX / rect.width) * 2 - 1;
            const y = -(event.clientY / rect.height) * 2 + 1;

            // 創建射線
            this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
            
            // 創建一個平面與計時器表面平行
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1).applyQuaternion(this.timerBody.quaternion));
            
            // 計算射線與平面的交點
            const intersection = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(plane, intersection);
            
            // 將交點轉換到計器本地坐標系
            const localPoint = this.timerBody.worldToLocal(intersection);
            
            // 計算在本地坐標系中的角度
            const angle = Math.atan2(localPoint.y, localPoint.x);
            let normalizedAngle = (-angle + Math.PI / 2) % (Math.PI * 2);
            if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
            
            // 調整吸附角度為30秒間隔
            const snapAngle = Math.round(normalizedAngle / (Math.PI / 60)) * (Math.PI / 60);
            
            // 計算時間（每個度代表30秒）
            const totalSeconds = Math.floor((snapAngle / (Math.PI * 2)) * 3600);
            const snappedSeconds = Math.round(totalSeconds / 30) * 30;
            
            this.duration = Math.min(snappedSeconds, 3600);
            this.currentTime = this.duration;
            
            this.initializeProgress();
        }

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects([this.clickableRing]);
        
        // 更新懸停狀態
        this.isHovering = intersects.length > 0;
        
        // 更游標樣式
        document.body.style.cursor = this.isHovering ? 'pointer' : 'default';
    }

    onMouseUp() {
        if (this.isDragging) {
            // 放開時開始計時
            this.isRunning = true;
            this.lastTime = Date.now();
            this.isDragging = false;

            // 確保綠色按鈕在正確位置
            this.buttonStates.orange = false;
            this.buttons.green.position.set(
                this.POSITION_OFFSET.BUTTONS.X.GREEN,
                this.POSITION_OFFSET.BUTTONS.Y.GREEN,
                this.POSITION_OFFSET.BUTTONS.Z.GREEN
            );
            this.buttons.green.material.emissiveIntensity = 0;
        }
        this.controlsEnabled = true;
        this.controls.enabled = true;
    }

    handleButtonClick(buttonType) {
        // 在任何按鈕點擊時停止警報聲和閃爍
        this.stopAlarmSound();
        this.stopFlashing();  // 添加停止閃爍
        
        switch (buttonType) {
            case 'green':
                // 切換狀態
                this.buttonStates.orange = !this.buttonStates.orange;
                
                if (this.buttonStates.orange) {
                    // 按下狀態 - 只改變位置和發光強度，不改變透明度
                    this.buttons.green.position.set(
                        this.POSITION_OFFSET.BUTTONS.X.GREEN,
                        this.POSITION_OFFSET.BUTTONS.Y.GREEN + this.BUTTON_EFFECTS.DOWN.Y_OFFSET,
                        this.POSITION_OFFSET.BUTTONS.Z.GREEN
                    );
                    this.buttons.green.material.emissiveIntensity = this.BUTTON_EFFECTS.DOWN.INTENSITY;
                    this.isRunning = false;
                } else {
                    // 彈起狀態
                    this.buttons.green.position.set(
                        this.POSITION_OFFSET.BUTTONS.X.GREEN,
                        this.POSITION_OFFSET.BUTTONS.Y.GREEN,
                        this.POSITION_OFFSET.BUTTONS.Z.GREEN
                    );
                    this.buttons.green.material.emissiveIntensity = 0;
                    
                    if (this.currentTime > 0) {
                        this.isRunning = true;
                        this.lastTime = Date.now();
                    }
                }
                
                // 停止閃爍效果（如果正在閃爍）
                if (this.isFlashing) {
                    this.stopFlashing();
                }
                break;
                
            case 'orange':
                // 橘色按鈕：按下後立即起，設定時間並開始計時
                const orangeY = this.POSITION_OFFSET.BUTTONS.Y.ORANGE + this.BUTTON_EFFECTS.DOWN.Y_OFFSET;
                this.buttons.orange.position.set(
                    this.POSITION_OFFSET.BUTTONS.X.ORANGE,
                    orangeY,
                    this.POSITION_OFFSET.BUTTONS.Z.ORANGE
                );
                this.buttons.orange.material.emissiveIntensity = this.BUTTON_EFFECTS.DOWN.INTENSITY;
                
                // 設定時間
                if (this.isInitialState) {
                    this.hand.rotation.z = Math.PI;
                    this.isInitialState = false;
                }
                const timeInput = document.querySelector('input[type="number"]');
                const minutes = parseInt(timeInput.value);
                if (minutes >= 1 && minutes <= 60) {
                    this.duration = minutes * 60;
                    this.currentTime = this.duration;
                    this.isRunning = true;  // 立即開始計時
                    this.lastTime = Date.now();
                    this.updateHand();
                    this.initializeProgress();
                }

                // 100ms 後彈起
                setTimeout(() => {
                    this.buttons.orange.position.set(
                        this.POSITION_OFFSET.BUTTONS.X.ORANGE,
                        this.POSITION_OFFSET.BUTTONS.Y.ORANGE,
                        this.POSITION_OFFSET.BUTTONS.Z.ORANGE
                    );
                    this.buttons.orange.material.emissiveIntensity = 0;
                }, 100);
                break;
                
            case 'back':
                // 切換靜��狀態
                this.isMuted = !this.isMuted;
                
                // 更新按鈕顏色
                const colors = this.isMuted ? 
                    this.COLORS.BUTTONS.BACK.BASE.MUTED : 
                    this.COLORS.BUTTONS.BACK.BASE.UNMUTED;
                const emissive = this.isMuted ? 
                    this.COLORS.BUTTONS.BACK.EMISSIVE.MUTED : 
                    this.COLORS.BUTTONS.BACK.EMISSIVE.UNMUTED;
                
                this.buttons.back.material.color.setHex(colors);
                this.buttons.back.material.emissive.setHex(emissive);
                
                // 按鈕點擊效果
                this.buttons.back.material.emissiveIntensity = 0.5;
                setTimeout(() => {
                    this.buttons.back.material.emissiveIntensity = 0;
                }, 100);
                
                // 更新界面上的靜音按鈕
                const muteIcon = document.querySelector('#muteIcon');
                if (muteIcon) {
                    muteIcon.textContent = this.isMuted ? '🔇' : '🔊';
                }

                // 顯示通知
                const notification = document.createElement('div');
                notification.className = 'mute-notification';
                if (this.isMuted) {
                    notification.innerHTML = `
                        已靜音
                        <span class="en">Sound Muted</span>
                    `;
                } else {
                    notification.innerHTML = `
                        已解除靜音
                        <span class="en">Sound Unmuted</span>
                    `;
                }
                document.body.appendChild(notification);

                // 顯示通知
                setTimeout(() => {
                    notification.classList.add('show');
                }, 10);

                // 3秒後移除通知
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                }, 3000);
                break;
        }
    }

    updateHand() {
        const progress = this.currentTime / this.duration;
        const maxAngle = Math.PI * 2;
        const timePosition = (this.duration / 3600) * maxAngle;
        
        // 使用原有的角度計算，但加初始移
        const angle = Math.PI / 2 - timePosition * progress;
        
        this.handGroup.rotation.z = angle;
        
        // 更進度條顯示
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
        
        // 設針置
        const maxAngle = Math.PI * 2;
        const timePosition = (this.duration / 3600) * maxAngle;
        const initialAngle = Math.PI / 2 - timePosition;
        this.handGroup.rotation.z = initialAngle;
        
        // 更新扇形區域
        this.progressSegments.forEach((segment, index) => {
            segment.visible = index < initialSegments;
        });
        
        // 更時間顯示
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        this.timeDisplaySpan.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // 生成滴答聲
    playTickSound() {
        if (this.isMuted) return;
        const now = Date.now();
        if (now - this.lastTickTime >= this.TICK_INTERVAL) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = this.SOUNDS.TICK.frequency;
            gainNode.gain.value = 0.1;  // 音量控制
            
            // 設量淡出
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + this.SOUNDS.TICK.duration
            );
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + this.SOUNDS.TICK.duration);
            
            this.lastTickTime = now;
        }
    }

    // 停止警報聲
    stopAlarmSound() {
        this.currentAlarmNodes.forEach(node => {
            node.stop();
            node.disconnect();
        });
        this.currentAlarmNodes = [];
    }

    // 生成警報聲
    playAlarmSound() {
        if (this.isMuted) return;
        let startTime = this.audioContext.currentTime;
        const endTime = startTime + 30; // 30秒後結束
        
        // 計算需要重複的次數以達到30秒
        const cycleTime = this.SOUNDS.ALARM.interval * 2; // 兩個頻率的總時間
        const cycles = Math.ceil(30 / cycleTime);
        
        for (let i = 0; i < cycles; i++) {
            this.SOUNDS.ALARM.frequencies.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.value = freq;
                gainNode.gain.value = 0.2;
                
                const time = startTime + i * this.SOUNDS.ALARM.interval;
                gainNode.gain.setValueAtTime(0, time);
                gainNode.gain.linearRampToValueAtTime(0.2, time + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.01,
                    time + this.SOUNDS.ALARM.duration
                );
                
                oscillator.start(time);
                oscillator.stop(time + this.SOUNDS.ALARM.duration);
                
                // 儲存節點以便之後停止
                this.currentAlarmNodes.push(oscillator);
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isRunning) {
            const now = Date.now();
            const delta = (now - this.lastTime);
            
            if (delta >= this.UPDATE_INTERVAL) {
                this.lastTime = now - (delta % this.UPDATE_INTERVAL);
                
                const timeDecrement = (this.UPDATE_INTERVAL / 1000) * this.timeScale;
                this.currentTime = Math.max(0, this.currentTime - timeDecrement);
                this.updateHand();

                // 播放倒數音效
                if (this.currentTime > 0) {
                    this.playTickSound();
                }

                if (this.currentTime <= 0) {
                    this.isRunning = false;
                    this.buttons.green.material.emissiveIntensity = 0;
                    this.isFlashing = true;
                    this.flashStartTime = Date.now();
                    this.lastBlinkTime = Date.now();
                    // 播放時間音效
                    this.playAlarmSound();
                }
            }
        }

        // 處理閃爍效果
        if (this.isFlashing) {
            const flashElapsed = Date.now() - this.flashStartTime;
            const currentTime = Date.now();
            
            if (flashElapsed < this.FLASH.DURATION) {
                // 計算閃爍狀態
                if (currentTime - this.lastBlinkTime >= this.FLASH.BLINK_INTERVAL) {
                    this.lastBlinkTime = currentTime;
                    // 切換閃爍狀態
                    const intensity = this.greyFace.material.emissiveIntensity > 0 ? 
                        this.FLASH.INTENSITY.NORMAL : this.FLASH.INTENSITY.FLASH;
                    
                    // 更新表盤和進度的發光強度
                    this.greyFace.material.emissive = new THREE.Color(0xFFFFFF);
                    this.greyFace.material.emissiveIntensity = intensity;
                    this.progressSegments.forEach(segment => {
                        segment.material.emissiveIntensity = intensity;
                    });
                }
            } else {
                // 結束閃爍效果
                this.isFlashing = false;
                this.greyFace.material.emissiveIntensity = 0;
                this.progressSegments.forEach(segment => {
                    segment.material.emissiveIntensity = 0;
                });
            }
        }

        // 只在控制器用時更新
        if (this.controlsEnabled) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    // 添加停止閃爍的方法
    stopFlashing() {
        this.isFlashing = false;
        this.greyFace.material.emissiveIntensity = 0;
        this.progressSegments.forEach(segment => {
            segment.material.emissiveIntensity = 0;
        });
    }
}

new PomodoroTimer(); 