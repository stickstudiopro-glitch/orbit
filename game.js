// Game Configuration
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        // Game State
        const gameState = {
            running: false,
            score: 0,
            wave: 1,
            playerHealth: 100,
            maxHealth: 100
        };

        // Player
        const player = {
            x: canvas.width / 2,
            y: canvas.height - 100,
            width: 30,
            height: 30,
            speed: 6,
            color: '#00ffff',
            velocityX: 0,
            velocityY: 0
        };

        // Arrays
        const bullets = [];
        const enemies = [];
        const particles = [];
        const powerups = [];

        // Input
        const keys = {};

        // Mouse
        let mouseX = canvas.width / 2;
        let mouseY = canvas.height / 2;

        // Event Listeners
        document.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' && gameState.running) {
                e.preventDefault();
                shootBullet();
            }
        });

        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });

        canvas.addEventListener('click', () => {
            if (gameState.running) {
                shootBullet();
            }
        });

        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('restartBtn').addEventListener('click', restartGame);

        // Create starfield
        function createStarfield() {
            const starfield = document.getElementById('starfield');
            for (let i = 0; i < 100; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                const size = Math.random() * 3;
                star.style.width = size + 'px';
                star.style.height = size + 'px';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.animationDelay = Math.random() * 3 + 's';
                starfield.appendChild(star);
            }
        }

        createStarfield();

        function startGame() {
            document.getElementById('startScreen').classList.add('hidden');
            gameState.running = true;
            gameState.score = 0;
            gameState.wave = 1;
            gameState.playerHealth = 100;
            player.x = canvas.width / 2;
            player.y = canvas.height - 100;
            bullets.length = 0;
            enemies.length = 0;
            particles.length = 0;
            spawnWave();
            gameLoop();
        }

        function restartGame() {
            document.getElementById('gameOverScreen').classList.add('hidden');
            startGame();
        }

        function gameOver() {
            gameState.running = false;
            document.getElementById('finalScore').textContent = gameState.score;
            document.getElementById('gameOverScreen').classList.remove('hidden');
        }

        function showWaveNotification() {
            const notification = document.createElement('div');
            notification.className = 'wave-notification';
            notification.textContent = `WAVE ${gameState.wave}`;
            document.getElementById('gameContainer').appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }

        function spawnWave() {
            showWaveNotification();
            const enemyCount = 5 + gameState.wave * 2;
            for (let i = 0; i < enemyCount; i++) {
                setTimeout(() => {
                    enemies.push({
                        x: Math.random() * canvas.width,
                        y: -50 - Math.random() * 200,
                        width: 25,
                        height: 25,
                        speed: 1 + gameState.wave * 0.3,
                        health: 1 + Math.floor(gameState.wave / 3),
                        color: `hsl(${Math.random() * 60 + 280}, 100%, 50%)`,
                        shootTimer: Math.random() * 100
                    });
                }, i * 200);
            }
        }

        function shootBullet() {
            const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
            bullets.push({
                x: player.x,
                y: player.y,
                radius: 4,
                velocityX: Math.cos(angle) * 10,
                velocityY: Math.sin(angle) * 10,
                color: '#ffff00'
            });
        }

        function updatePlayer() {
            // Movement
            player.velocityX = 0;
            player.velocityY = 0;

            if (keys['arrowleft'] || keys['a']) player.velocityX = -player.speed;
            if (keys['arrowright'] || keys['d']) player.velocityX = player.speed;
            if (keys['arrowup'] || keys['w']) player.velocityY = -player.speed;
            if (keys['arrowdown'] || keys['s']) player.velocityY = player.speed;

            player.x += player.velocityX;
            player.y += player.velocityY;

            // Boundaries
            player.x = Math.max(player.width, Math.min(canvas.width - player.width, player.x));
            player.y = Math.max(player.height, Math.min(canvas.height - player.height, player.y));
        }

        function drawPlayer() {
            // Ship body
            ctx.save();
            ctx.translate(player.x, player.y);
            
            const angle = Math.atan2(mouseY - player.y, mouseX - player.x) + Math.PI / 2;
            ctx.rotate(angle);

            // Outer glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = player.color;

            // Ship triangle
            ctx.beginPath();
            ctx.moveTo(0, -player.height);
            ctx.lineTo(-player.width / 2, player.height / 2);
            ctx.lineTo(player.width / 2, player.height / 2);
            ctx.closePath();
            ctx.fillStyle = player.color;
            ctx.fill();

            // Inner detail
            ctx.beginPath();
            ctx.moveTo(0, -player.height / 2);
            ctx.lineTo(-player.width / 4, player.height / 4);
            ctx.lineTo(player.width / 4, player.height / 4);
            ctx.closePath();
            ctx.fillStyle = '#ff00ff';
            ctx.fill();

            ctx.restore();
        }

        function updateBullets() {
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                bullet.x += bullet.velocityX;
                bullet.y += bullet.velocityY;

                // Remove off-screen bullets
                if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
                    bullets.splice(i, 1);
                }
            }
        }

        function drawBullets() {
            bullets.forEach(bullet => {
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = bullet.color;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
                ctx.fillStyle = bullet.color;
                ctx.fill();
                ctx.restore();
            });
        }

        function updateEnemies() {
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                enemy.y += enemy.speed;

                // Enemy shooting
                enemy.shootTimer++;
                if (enemy.shootTimer > 60 && Math.random() < 0.02) {
                    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    bullets.push({
                        x: enemy.x,
                        y: enemy.y,
                        radius: 3,
                        velocityX: Math.cos(angle) * 4,
                        velocityY: Math.sin(angle) * 4,
                        color: '#ff0040',
                        enemy: true
                    });
                    enemy.shootTimer = 0;
                }

                // Remove off-screen enemies
                if (enemy.y > canvas.height + 50) {
                    enemies.splice(i, 1);
                }
            }

            // Check if wave is complete
            if (enemies.length === 0 && gameState.running) {
                gameState.wave++;
                setTimeout(() => spawnWave(), 2000);
            }
        }

        function drawEnemies() {
            enemies.forEach(enemy => {
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = enemy.color;
                
                // Enemy shape (hexagon)
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = enemy.x + Math.cos(angle) * enemy.width;
                    const y = enemy.y + Math.sin(angle) * enemy.height;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fillStyle = enemy.color;
                ctx.fill();
                ctx.restore();
            });
        }

        function checkCollisions() {
            // Bullet-Enemy collisions
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                if (bullet.enemy) continue;

                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);

                    if (dist < bullet.radius + enemy.width) {
                        // Create particles
                        createExplosion(enemy.x, enemy.y, enemy.color);

                        // Damage enemy
                        enemy.health--;
                        if (enemy.health <= 0) {
                            enemies.splice(j, 1);
                            gameState.score += 10 * gameState.wave;
                        }
                        bullets.splice(i, 1);
                        break;
                    }
                }
            }

            // Enemy bullet-Player collisions
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                if (!bullet.enemy) continue;

                const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
                if (dist < bullet.radius + player.width) {
                    bullets.splice(i, 1);
                    gameState.playerHealth -= 10;
                    createExplosion(bullet.x, bullet.y, '#ff0040');
                    
                    if (gameState.playerHealth <= 0) {
                        gameOver();
                    }
                }
            }

            // Enemy-Player collisions
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);

                if (dist < enemy.width + player.width) {
                    enemies.splice(i, 1);
                    gameState.playerHealth -= 20;
                    createExplosion(enemy.x, enemy.y, enemy.color);
                    
                    if (gameState.playerHealth <= 0) {
                        gameOver();
                    }
                }
            }
        }

        function createExplosion(x, y, color) {
            for (let i = 0; i < 15; i++) {
                particles.push({
                    x: x,
                    y: y,
                    radius: Math.random() * 3 + 1,
                    velocityX: (Math.random() - 0.5) * 8,
                    velocityY: (Math.random() - 0.5) * 8,
                    color: color,
                    life: 60
                });
            }
        }

        function updateParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                particle.x += particle.velocityX;
                particle.y += particle.velocityY;
                particle.velocityX *= 0.98;
                particle.velocityY *= 0.98;
                particle.life--;

                if (particle.life <= 0) {
                    particles.splice(i, 1);
                }
            }
        }

        function drawParticles() {
            particles.forEach(particle => {
                ctx.save();
                ctx.globalAlpha = particle.life / 60;
                ctx.shadowBlur = 10;
                ctx.shadowColor = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.fill();
                ctx.restore();
            });
        }

        function updateHUD() {
            document.getElementById('scoreDisplay').textContent = gameState.score;
            document.getElementById('waveDisplay').textContent = gameState.wave;
            document.getElementById('enemiesDisplay').textContent = enemies.length;
            
            const healthPercent = Math.max(0, (gameState.playerHealth / gameState.maxHealth) * 100);
            document.getElementById('healthFill').style.width = healthPercent + '%';
        }

        function gameLoop() {
            if (!gameState.running) return;

            // Clear canvas
            ctx.fillStyle = 'rgba(10, 0, 21, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update
            updatePlayer();
            updateBullets();
            updateEnemies();
            updateParticles();
            checkCollisions();

            // Draw
            drawParticles();
            drawEnemies();
            drawBullets();
            drawPlayer();

            // Update HUD
            updateHUD();

            requestAnimationFrame(gameLoop);
        }