// ==========================================
// Rocket & Spacecraft Designer (VAB)
// ==========================================

const Builder = {
    canvas: null,
    ctx: null,
    currentCategory: 'all',
    assembledParts: [], // array of { id, partId, name, category, x, y, width, height, mass, cost, ... }
    selectedPart: null,
    draggingPart: null,
    dragOffset: { x: 0, y: 0 },
    history: [],
    historyIndex: -1,
    stages: [],
    camera: { x: 0, y: 0, zoom: 1.0 },
    isPanning: false,
    panStart: { x: 0, y: 0 },
    gridSize: 20,
    initialized: false,

    init() {
        if (!this.canvas) {
            this.canvas = document.getElementById('builder-canvas');
        }
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
            requestAnimationFrame(() => this.resize());
        }

        if (!this.initialized) {
            this.bindEvents();
            this.initialized = true;
        }

        this.renderCatalog();

        // If empty, offer or load a starter rocket
        if (this.assembledParts.length === 0) {
            const saved = Utils.loadData('autosave_rocket_v2');
            if (saved && saved.length > 0) {
                this.loadRocket(saved);
            } else {
                this.loadDefaultRocket();
            }
        }

        this.updateStats();
        this.renderStages();
        this.validateDesign(false);
        this.render();
    },

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.render();
    },

    bindEvents() {
        // Category buttons
        const catBtns = document.querySelectorAll('.part-categories .cat-btn');
        catBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                catBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.cat;
                this.renderCatalog();
            });
        });

        // Toolbar
        document.getElementById('btn-undo')?.addEventListener('click', () => this.undo());
        document.getElementById('btn-redo')?.addEventListener('click', () => this.redo());
        document.getElementById('btn-clear-build')?.addEventListener('click', () => {
            Modal.show({
                title: 'Clear Assembly',
                content: 'Are you sure you want to clear the entire rocket assembly?',
                buttons: [
                    { text: 'Cancel' },
                    { text: 'Clear', primary: true, onClick: () => { this.assembledParts = []; this.saveState(); this.updateStats(); this.render(); } }
                ]
            });
        });
        document.getElementById('btn-save-design')?.addEventListener('click', () => this.saveDesignPrompt());
        document.getElementById('btn-load-design')?.addEventListener('click', () => this.loadDesignPrompt());
        document.getElementById('btn-validate')?.addEventListener('click', () => this.validateDesign(true));

        // Back to missions
        document.getElementById('btn-back-missions')?.addEventListener('click', () => {
            Utils.showScreen('mission-select-screen');
        });

        // Launch button
        document.getElementById('btn-launch')?.addEventListener('click', () => this.launch());

        // Add stage button
        document.getElementById('btn-add-stage')?.addEventListener('click', () => this.addStage());

        // Canvas mouse interactions (drag-and-drop & pan)
        if (this.canvas) {
            this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
            window.addEventListener('mouseup', (e) => this.onMouseUp(e));
            this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

            // Keyboard shortcuts (Delete, Rotate)
            window.addEventListener('keydown', (e) => {
                if (document.getElementById('builder-screen').classList.contains('active')) {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                        if (this.selectedPart) {
                            this.removePart(this.selectedPart);
                        }
                    } else if (e.key === 'r' || e.key === 'R') {
                        if (this.selectedPart) {
                            this.rotatePart(this.selectedPart);
                        }
                    }
                }
            });
        }
    },

    saveState() {
        // Truncate future states if we performed an action after undo
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(Utils.deepClone(this.assembledParts));
        if (this.history.length > 30) this.history.shift();
        this.historyIndex = this.history.length - 1;

        // Autosave
        Utils.saveData('autosave_rocket_v2', this.assembledParts);
    },

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.assembledParts = Utils.deepClone(this.history[this.historyIndex]);
            this.selectedPart = null;
            this.updateStats();
            this.renderStages();
            this.render();
            Toast.show('Undo', 'info', 1000);
        }
    },

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.assembledParts = Utils.deepClone(this.history[this.historyIndex]);
            this.selectedPart = null;
            this.updateStats();
            this.renderStages();
            this.render();
            Toast.show('Redo', 'info', 1000);
        }
    },

    renderCatalog() {
        const container = document.getElementById('parts-list');
        if (!container) return;

        container.innerHTML = '';
        const parts = Parts.getByCategory(this.currentCategory);

        parts.forEach(part => {
            const item = document.createElement('div');
            item.className = 'part-item';
            item.draggable = true;

            item.innerHTML = `
                <div class="part-icon">${part.icon}</div>
                <div class="part-info">
                    <div class="part-name">${part.name}</div>
                    <div class="part-brief">${part.mass} kg | ${Utils.formatMoney(part.cost)}</div>
                    <div class="part-cost">${part.category.toUpperCase()}</div>
                </div>
            `;

            // Click to add to assembly
            item.addEventListener('click', () => {
                this.addPartToCenter(part);
            });

            // Hover sound
            item.addEventListener('mouseenter', () => {
                if (typeof Audio !== 'undefined') Audio.play('hover');
            });

            container.appendChild(item);
        });
    },

    addPartToCenter(partTemplate) {
        const centerX = 0;
        let targetY = 0;

        // Stack below or above existing parts
        if (this.assembledParts.length > 0) {
            if (partTemplate.category === 'command' || partTemplate.category === 'payload') {
                // Stack at the very top
                const topPart = this.assembledParts.reduce((min, p) => p.y < min.y ? p : min, this.assembledParts[0]);
                targetY = topPart.y - (topPart.height / 2 + partTemplate.height / 2);
            } else if (partTemplate.category === 'engine') {
                // Stack at the bottom
                const bottomPart = this.assembledParts.reduce((max, p) => p.y > max.y ? p : max, this.assembledParts[0]);
                targetY = bottomPart.y + (bottomPart.height / 2 + partTemplate.height / 2);
            } else {
                // Stack under the lowest non-engine part
                const nonEngines = this.assembledParts.filter(p => p.category !== 'engine');
                if (nonEngines.length > 0) {
                    const bottom = nonEngines.reduce((max, p) => p.y > max.y ? p : max, nonEngines[0]);
                    targetY = bottom.y + (bottom.height / 2 + partTemplate.height / 2);
                } else {
                    targetY = 0;
                }
            }
        }

        const newPart = {
            ...Utils.deepClone(partTemplate),
            instanceId: Utils.uid(),
            x: centerX,
            y: targetY,
            rotation: 0,
            stageNum: this.assignStageForPart(partTemplate)
        };

        this.assembledParts.push(newPart);
        this.selectedPart = newPart;
        this.showPartDetails(newPart);
        this.saveState();
        this.updateStats();
        this.renderStages();
        this.render();

        if (typeof Audio !== 'undefined') Audio.play('click');
        Toast.show(`Added ${newPart.name}`, 'info', 1200);
    },

    assignStageForPart(part) {
        if (part.category === 'booster') return 0;
        if (part.category === 'engine') {
            const numEngines = this.assembledParts.filter(p => p.category === 'engine').length;
            return numEngines > 1 ? 1 : 0;
        }
        return 0;
    },

    loadDefaultRocket() {
        // "Vanguard-3": a balanced 3-stage orbital launcher (staged dV ~10.4 km/s,
        // liftoff TWR ~2.2). Verified to reach a 380 x 400 km orbit in the physics engine.
        const spec = [
            ['struct_fairing', 2], ['satellite_bus', 2], ['sci_camera', 2], ['solar_panel', 2], ['antenna', 2],
            ['cmd_probe', 2], ['fuel_small', 2], ['engine_vacuum', 2],
            ['struct_decoupler', 1], ['fuel_medium', 1], ['engine_medium', 1],
            ['struct_decoupler', 0], ['fuel_huge', 0], ['fuel_large', 0], ['engine_medium', 0]
        ];
        const total = spec.reduce((s, [id]) => s + Parts.getById(id).height, 0);
        let cursor = -total / 2;
        this.assembledParts = spec.map(([id, stage], i) => {
            const tpl = Parts.getById(id);
            const part = { ...Utils.deepClone(tpl), instanceId: 'dflt_' + i, x: 0, y: cursor + tpl.height / 2, rotation: 0, stageNum: stage };
            cursor += tpl.height;
            return part;
        });

        this.saveState();
        this.updateStats();
        this.renderStages();
        this.render();
    },

    removePart(part) {
        this.assembledParts = this.assembledParts.filter(p => p.instanceId !== part.instanceId);
        this.selectedPart = null;
        this.showPartDetails(null);
        this.saveState();
        this.updateStats();
        this.renderStages();
        this.render();
        Toast.show('Part Removed', 'info', 1000);
    },

    rotatePart(part) {
        part.rotation = (part.rotation || 0) + Math.PI / 2;
        if (part.rotation >= Math.PI * 2) part.rotation = 0;
        this.saveState();
        this.render();
    },

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Middle click or space+click for panning
        if (e.button === 1 || e.shiftKey) {
            this.isPanning = true;
            this.panStart = { x: mouseX - this.camera.x, y: mouseY - this.camera.y };
            return;
        }

        // Convert mouse to world coords
        const world = this.screenToWorld(mouseX, mouseY);

        // Find clicked part (from top of display list down)
        let clicked = null;
        for (let i = this.assembledParts.length - 1; i >= 0; i--) {
            const p = this.assembledParts[i];
            const hw = (p.width || 20) / 2;
            const hh = (p.height || 20) / 2;
            if (world.x >= p.x - hw && world.x <= p.x + hw &&
                world.y >= p.y - hh && world.y <= p.y + hh) {
                clicked = p;
                break;
            }
        }

        if (clicked) {
            this.selectedPart = clicked;
            this.draggingPart = clicked;
            this.dragOffset = { x: world.x - clicked.x, y: world.y - clicked.y };
            this.showPartDetails(clicked);
            if (typeof Audio !== 'undefined') Audio.play('click');
        } else {
            this.selectedPart = null;
            this.showPartDetails(null);
            this.isPanning = true;
            this.panStart = { x: mouseX - this.camera.x, y: mouseY - this.camera.y };
        }

        this.render();
    },

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.isPanning) {
            this.camera.x = mouseX - this.panStart.x;
            this.camera.y = mouseY - this.panStart.y;
            this.render();
            return;
        }

        if (this.draggingPart) {
            const world = this.screenToWorld(mouseX, mouseY);
            let targetX = world.x - this.dragOffset.x;
            let targetY = world.y - this.dragOffset.y;

            // Snap to vertical centerline (x = 0) if close
            if (Math.abs(targetX) < 15) {
                targetX = 0;
            }

            // Snap to connection points of nearby parts
            for (const other of this.assembledParts) {
                if (other.instanceId === this.draggingPart.instanceId) continue;

                // Vertical snap
                if (Math.abs(targetX - other.x) < 15) {
                    const snapTop = other.y - (other.height / 2 + this.draggingPart.height / 2);
                    const snapBottom = other.y + (other.height / 2 + this.draggingPart.height / 2);

                    if (Math.abs(targetY - snapTop) < 15) {
                        targetY = snapTop;
                        targetX = other.x;
                        break;
                    } else if (Math.abs(targetY - snapBottom) < 15) {
                        targetY = snapBottom;
                        targetX = other.x;
                        break;
                    }
                }
            }

            this.draggingPart.x = targetX;
            this.draggingPart.y = targetY;
            this.render();
        }
    },

    onMouseUp(e) {
        if (this.draggingPart) {
            this.draggingPart = null;
            this.saveState();
            this.updateStats();
        }
        this.isPanning = false;
    },

    onWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = Utils.clamp(this.camera.zoom * zoomFactor, 0.4, 2.5);
        this.render();
    },

    worldToScreen(x, y) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        return {
            x: (x * this.camera.zoom) + cx + this.camera.x,
            y: (y * this.camera.zoom) + cy + this.camera.y
        };
    },

    screenToWorld(screenX, screenY) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        return {
            x: (screenX - cx - this.camera.x) / this.camera.zoom,
            y: (screenY - cy - this.camera.y) / this.camera.zoom
        };
    },

    render() {
        if (!this.canvas || !this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Blueprint VAB background
        ctx.fillStyle = '#080d1a';
        ctx.fillRect(0, 0, w, h);

        // Draw blueprint grid
        this.drawGrid(ctx, w, h);

        // Draw launchpad / assembly gantry ground line
        const groundScreen = this.worldToScreen(0, 150);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundScreen.y);
        ctx.lineTo(w, groundScreen.y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(0, groundScreen.y, w, h - groundScreen.y);

        // Draw Centerline
        const centerTop = this.worldToScreen(0, -500);
        const centerBottom = this.worldToScreen(0, 500);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(centerTop.x, 0);
        ctx.lineTo(centerBottom.x, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw parts
        this.assembledParts.forEach(p => {
            const screen = this.worldToScreen(p.x, p.y);
            const sw = (p.width || 20) * this.camera.zoom;
            const sh = (p.height || 20) * this.camera.zoom;

            ctx.save();
            ctx.translate(screen.x, screen.y);
            if (p.rotation) ctx.rotate(p.rotation);

            // Draw part body using renderer helper
            this.drawBuilderPart(ctx, p, 0, -sh / 2, sw, sh);

            // Selection highlight
            if (this.selectedPart && this.selectedPart.instanceId === p.instanceId) {
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 2]);
                ctx.strokeRect(-sw / 2 - 4, -sh / 2 - 4, sw + 8, sh + 8);
                ctx.setLineDash([]);

                // Stage badge
                ctx.fillStyle = '#f97316';
                ctx.font = '10px Share Tech Mono';
                ctx.textAlign = 'right';
                ctx.fillText(`S${p.stageNum || 0}`, sw / 2 + 16, -sh / 2);
            }

            ctx.restore();
        });

        // Legend / Controls Overlay
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = '11px Rajdhani';
        ctx.textAlign = 'left';
        ctx.fillText('CLICK & DRAG to assemble | R to rotate | DEL to remove | SCROLL to zoom', 16, h - 16);
    },

    drawGrid(ctx, w, h) {
        const step = this.gridSize * this.camera.zoom;
        const cx = (w / 2 + this.camera.x) % step;
        const cy = (h / 2 + this.camera.y) % step;

        ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = cx; x < w; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = cy; y < h; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
    },

    drawBuilderPart(ctx, part, x, y, w, h) {
        // High quality VAB blueprint rendering
        const cat = part.category;

        switch (cat) {
            case 'command':
                // Command capsule
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.moveTo(x - w / 2, y + h);
                ctx.lineTo(-w / 4, y);
                ctx.lineTo(w / 4, y);
                ctx.lineTo(x + w / 2, y + h);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Hatch & window
                ctx.fillStyle = '#bae6fd';
                ctx.beginPath();
                ctx.arc(0, y + h * 0.45, w * 0.16, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'fuel':
                // Fuel tank
                ctx.fillStyle = '#ea580c';
                Utils.drawRoundRect(ctx, -w / 2, y, w, h, 4);
                ctx.fill();
                ctx.strokeStyle = '#fb923c';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Ribbing lines
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.moveTo(-w / 2 + 2, y + h * 0.33);
                ctx.lineTo(w / 2 - 2, y + h * 0.33);
                ctx.moveTo(-w / 2 + 2, y + h * 0.66);
                ctx.lineTo(w / 2 - 2, y + h * 0.66);
                ctx.stroke();
                break;

            case 'engine':
                // Rocket engine
                ctx.fillStyle = '#7c3aed';
                ctx.beginPath();
                ctx.moveTo(-w / 3, y);
                ctx.lineTo(-w / 2, y + h);
                ctx.lineTo(w / 2, y + h);
                ctx.lineTo(w / 3, y);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Combustion chamber
                ctx.fillStyle = '#374151';
                ctx.fillRect(-w / 4, y, w / 2, h * 0.25);
                break;

            case 'booster':
                // Solid booster
                ctx.fillStyle = '#dc2626';
                Utils.drawRoundRect(ctx, -w / 2, y, w, h, 3);
                ctx.fill();
                ctx.strokeStyle = '#f87171';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Nosecone
                ctx.fillStyle = '#991b1b';
                ctx.beginPath();
                ctx.moveTo(-w / 2, y);
                ctx.lineTo(0, y - h * 0.15);
                ctx.lineTo(w / 2, y);
                ctx.closePath();
                ctx.fill();
                break;

            case 'structural':
                ctx.fillStyle = '#475569';
                Utils.drawRoundRect(ctx, -w / 2, y, w, h, 2);
                ctx.fill();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Cross truss
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.moveTo(-w / 2, y);
                ctx.lineTo(w / 2, y + h);
                ctx.moveTo(w / 2, y);
                ctx.lineTo(-w / 2, y + h);
                ctx.stroke();
                break;

            case 'utility':
                ctx.fillStyle = '#0284c7';
                Utils.drawRoundRect(ctx, -w / 2, y, w, h, 3);
                ctx.fill();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // If solar panel
                if (part.type === 'solar_panel') {
                    ctx.fillStyle = '#0369a1';
                    ctx.fillRect(-w * 1.1, y + 2, w * 0.5, h - 4);
                    ctx.fillRect(w * 0.6, y + 2, w * 0.5, h - 4);
                }
                break;

            case 'science':
                ctx.fillStyle = '#9333ea';
                Utils.drawRoundRect(ctx, -w / 2, y, w, h, 3);
                ctx.fill();
                ctx.strokeStyle = '#d8b4fe';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Lens / sensor
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(0, y + h / 2, Math.min(w, h) * 0.25, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'payload':
                ctx.fillStyle = '#059669';
                Utils.drawRoundRect(ctx, -w / 2, y, w, h, 3);
                ctx.fill();
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                break;

            default:
                ctx.fillStyle = '#64748b';
                Utils.drawRoundRect(ctx, -w / 2, y, w, h, 2);
                ctx.fill();
        }
    },

    showPartDetails(part) {
        const container = document.getElementById('part-details');
        if (!container) return;

        if (!part) {
            container.innerHTML = '<p class="placeholder-text">Click a part to view details</p>';
            return;
        }

        container.innerHTML = `
            <div class="part-detail-name">${part.name}</div>
            <div class="part-detail-row"><span>Category</span><span>${part.category.toUpperCase()}</span></div>
            <div class="part-detail-row"><span>Mass</span><span>${part.mass} kg</span></div>
            <div class="part-detail-row"><span>Cost</span><span>${Utils.formatMoney(part.cost)}</span></div>
            ${part.thrust ? `<div class="part-detail-row"><span>Thrust</span><span>${Utils.formatNumber(part.thrust / 1000)} kN</span></div>` : ''}
            ${part.isp ? `<div class="part-detail-row"><span>Specific Impulse</span><span>${part.isp} s</span></div>` : ''}
            ${part.fuelCapacity ? `<div class="part-detail-row"><span>Fuel</span><span>${part.fuelCapacity} L</span></div>` : ''}
            ${part.powerGen ? `<div class="part-detail-row"><span>Power Gen</span><span>+${part.powerGen} W</span></div>` : ''}
            ${part.powerUse ? `<div class="part-detail-row"><span>Power Draw</span><span>-${part.powerUse} W</span></div>` : ''}
            ${part.scienceValue ? `<div class="part-detail-row"><span>Science</span><span>+${part.scienceValue}</span></div>` : ''}
            <div class="part-detail-row"><span>Assigned Stage</span><span>Stage ${part.stageNum || 0}</span></div>
            <div style="display: flex; gap: 6px; margin-top: 10px;">
                <button class="btn-sm" id="btn-part-rotate">Rotate (R)</button>
                <button class="btn-sm" id="btn-part-del" style="color: var(--accent-red); border-color: rgba(239,68,68,0.4);">Delete</button>
            </div>
        `;

        document.getElementById('btn-part-rotate')?.addEventListener('click', () => this.rotatePart(part));
        document.getElementById('btn-part-del')?.addEventListener('click', () => this.removePart(part));
    },

    updateStats() {
        const craft = new Spacecraft({ parts: this.assembledParts });

        const setStat = (id, val, color) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = val;
                if (color) el.style.color = color;
            }
        };

        const totalMass = craft.totalMass;
        const totalFuel = craft.calculateTotalFuel();
        const maxThrust = craft.getCurrentThrust();
        const twr = craft.getTWR();
        const deltaV = craft.getDeltaV();
        const cost = craft.totalCost;
        const budget = MissionMgr.getBudget();

        setStat('stat-mass', `${Utils.formatNumber(totalMass)} kg`);
        setStat('stat-fuel', `${Utils.formatNumber(totalFuel)} L`);
        setStat('stat-thrust', `${Utils.formatNumber(maxThrust / 1000)} kN`);
        setStat('stat-twr', twr.toFixed(2), twr >= 1.2 ? 'var(--accent-green)' : (twr >= 1.0 ? 'var(--accent-yellow)' : 'var(--accent-red)'));
        setStat('stat-deltav', `${Utils.formatNumber(deltaV)} m/s`, deltaV >= 8000 ? 'var(--accent-green)' : 'var(--accent-cyan)');
        setStat('stat-cost', Utils.formatMoney(cost), cost <= budget ? 'var(--accent-green)' : 'var(--accent-red)');
        setStat('stat-power', `${craft.powerGeneration} W`);
        setStat('stat-power-use', `${craft.powerConsumption} W`);
        setStat('stat-comm', Utils.formatDistance(craft.commRange));
        setStat('stat-science', `${craft.scienceValue}`);
    },

    renderStages() {
        const container = document.getElementById('stage-list');
        if (!container) return;

        // Collect all distinct stage numbers
        const stageNums = [...new Set(this.assembledParts.map(p => p.stageNum || 0))].sort((a, b) => a - b);
        if (stageNums.length === 0) stageNums.push(0);

        container.innerHTML = '';
        stageNums.forEach(sNum => {
            const partsInStage = this.assembledParts.filter(p => (p.stageNum || 0) === sNum);
            const engines = partsInStage.filter(p => p.category === 'engine' || p.category === 'booster');

            const item = document.createElement('div');
            item.className = 'stage-item';
            item.innerHTML = `Stage ${sNum} (${partsInStage.length} parts${engines.length ? `, ${engines.length} eng` : ''})`;

            item.addEventListener('click', () => {
                if (this.selectedPart) {
                    this.selectedPart.stageNum = sNum;
                    this.saveState();
                    this.renderStages();
                    this.showPartDetails(this.selectedPart);
                    this.render();
                    Toast.show(`Assigned ${this.selectedPart.name} to Stage ${sNum}`, 'info');
                }
            });

            container.appendChild(item);
        });
    },

    addStage() {
        const currentMax = Math.max(0, ...this.assembledParts.map(p => p.stageNum || 0));
        const newStage = currentMax + 1;
        if (this.selectedPart) {
            this.selectedPart.stageNum = newStage;
            this.saveState();
            this.renderStages();
            this.showPartDetails(this.selectedPart);
            this.render();
            Toast.show(`Created Stage ${newStage}`, 'success');
        } else {
            Toast.show('Select a part first to place it into the new stage', 'warning');
        }
    },

    validateDesign(showModal = false) {
        const craft = new Spacecraft({ parts: this.assembledParts });
        const results = craft.validate();
        const budget = MissionMgr.getBudget();

        // Budget check
        const budgetOk = craft.totalCost <= budget;
        results.push({
            pass: budgetOk,
            message: budgetOk ? `Budget: ${Utils.formatMoney(craft.totalCost)} / ${Utils.formatMoney(budget)}` : `Over Budget! Exceeds by ${Utils.formatMoney(craft.totalCost - budget)}`,
            severity: budgetOk ? 'pass' : 'fail'
        });

        // Update list on UI
        const container = document.getElementById('validation-results');
        if (container) {
            container.innerHTML = '';
            results.forEach(res => {
                const icon = res.severity === 'pass' ? '✓' : (res.severity === 'warn' ? '' : '✕');
                const row = document.createElement('div');
                row.className = `validation-item ${res.severity}`;
                row.innerHTML = `<span>${icon}</span><span>${res.message}</span>`;
                container.appendChild(row);
            });
        }

        if (showModal) {
            const fails = results.filter(r => r.severity === 'fail');
            Modal.show({
                title: fails.length === 0 ? 'Design Validated' : 'Validation Issues',
                content: results.map(r => `<div style="padding: 4px 0; color: ${r.severity === 'pass' ? 'var(--accent-green)' : (r.severity === 'warn' ? 'var(--accent-yellow)' : 'var(--accent-red)')}">${r.message}</div>`).join(''),
                buttons: [{ text: 'Close', primary: fails.length === 0 }]
            });
        }

        return results.every(r => r.severity !== 'fail');
    },

    saveDesignPrompt() {
        Modal.show({
            title: 'Save Rocket Design',
            content: `
                <p>Enter a name for your spacecraft design:</p>
                <input type="text" id="save-design-name" value="${MissionMgr.currentMission?.name || 'Rocket'} Mk1" style="width: 100%; padding: 8px 12px; margin-top: 10px; background: rgba(15,23,42,0.8); border: 1px solid var(--border-color); color: white; border-radius: 6px;">
            `,
            buttons: [
                { text: 'Cancel' },
                {
                    text: 'Save', primary: true, onClick: () => {
                        const name = document.getElementById('save-design-name')?.value || 'Custom Rocket';
                        const savedRockets = Utils.loadData('saved_rockets') || [];
                        savedRockets.push({
                            id: Utils.uid(),
                            name: name,
                            date: new Date().toLocaleDateString(),
                            parts: this.assembledParts
                        });
                        Utils.saveData('saved_rockets', savedRockets);
                        Toast.show(`Saved "${name}" successfully`, 'success');
                    }
                }
            ]
        });
    },

    loadDesignPrompt() {
        const savedRockets = Utils.loadData('saved_rockets') || [];
        if (savedRockets.length === 0) {
            Modal.show({
                title: 'Load Design',
                content: '<p>No saved rocket designs found. Try building and saving one, or load the starter rocket.</p>',
                buttons: [
                    { text: 'Load Starter Rocket', primary: true, onClick: () => this.loadDefaultRocket() },
                    { text: 'Close' }
                ]
            });
            return;
        }

        let listHtml = '<div style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">';
        savedRockets.forEach((r, idx) => {
            listHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;" id="load-item-${idx}">
                    <div>
                        <strong style="color: var(--accent-cyan);">${r.name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${r.date} | ${r.parts.length} parts</div>
                    </div>
                    <button class="btn-sm">Load</button>
                </div>
            `;
        });
        listHtml += '</div>';

        Modal.show({
            title: 'Load Saved Rocket',
            content: listHtml,
            buttons: [{ text: 'Cancel' }]
        });

        savedRockets.forEach((r, idx) => {
            document.getElementById(`load-item-${idx}`)?.addEventListener('click', () => {
                this.loadRocket(r.parts);
                Modal.hide();
                Toast.show(`Loaded "${r.name}"`, 'success');
            });
        });
    },

    loadRocket(parts) {
        this.assembledParts = Utils.deepClone(parts);
        this.selectedPart = null;
        this.saveState();
        this.updateStats();
        this.renderStages();
        this.render();
    },

    launch() {
        // Validate
        const isValid = this.validateDesign(false);
        const isSandbox = MissionMgr.currentMission?.isSandbox;

        if (!isValid && !isSandbox) {
            this.validateDesign(true);
            return;
        }

        // Construct spacecraft
        const craft = new Spacecraft({
            name: MissionMgr.currentMission?.name || 'Vanguard 1',
            parts: Utils.deepClone(this.assembledParts)
        });

        // Launch into simulation screen
        Utils.showScreen('simulation-screen');
        if (typeof Simulation !== 'undefined') {
            Simulation.start(craft);
        }

        if (typeof Audio !== 'undefined') Audio.play('launch');
        Toast.show('Initiating Launch Sequence! T-0', 'success');
    }
};
