import { createCanvas, loadImage } from "canvas"

const CANVAS_W = 800
const CANVAS_H = 350

function processText(text: string, data: any) {
    if (!text) return ""
    return text
        .replace(/{username}/g, data.username)
        .replace(/{user}/g, data.username)
        .replace(/{server}/g, data.serverName)
        .replace(/{count}/g, String(data.memberCount))
        .replace(/{message}/g, data.message || "")
}

export async function generateWelcomeImage(template: any, data: any) {
    const canvas = createCanvas(CANVAS_W, CANVAS_H)
    const ctx = canvas.getContext("2d")

    // ===== FUNDO =====
    if (template.background) {
        if (template.background.type === "image" && template.background.image) {
            try {
                const img = await loadImage(template.background.image)
                ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H)
            } catch {
                ctx.fillStyle = template.background.color || "#23272a"
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
            }
        } else if (template.background.type === "gradient" && template.background.gradient) {
            const g = template.background.gradient
            let grad

            if (g.type === "radial") {
                grad = ctx.createRadialGradient(
                    CANVAS_W / 2, CANVAS_H / 2, 0,
                    CANVAS_W / 2, CANVAS_H / 2, CANVAS_W / 2
                )
            } else {
                const angle = (g.angle || 0) * Math.PI / 180
                grad = ctx.createLinearGradient(
                    0, 0,
                    Math.cos(angle) * CANVAS_W,
                    Math.sin(angle) * CANVAS_H
                )
            }

            grad.addColorStop(0, g.start || "#5865F2")
            grad.addColorStop(1, g.end || "#eb459e")

            ctx.fillStyle = grad
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
        } else {
            ctx.fillStyle = template.background.color || "#23272a"
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
        }
    } else {
        ctx.fillStyle = "#23272a"
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    }

    // ===== LAYERS =====
    if (template.layers && Array.isArray(template.layers)) {
        const layers = [...template.layers].sort((a, b) => a.zIndex - b.zIndex)

        for (const layer of layers) {
            if (!layer.visible) continue

            ctx.save()
            ctx.globalAlpha = layer.opacity ?? 1

            if (layer.type === "text") {
                const t = layer.data
                const text = processText(t.text, data)

                let font = ""
                if (t.bold) font += "bold "
                if (t.italic) font += "italic "
                font += `${t.fontSize}px ${t.fontFamily || "sans-serif"}`

                ctx.font = font
                ctx.fillStyle = t.color || "#fff"

                if (t.shadow?.enabled) {
                    ctx.shadowColor = t.shadow.color || "#000"
                    ctx.shadowBlur = t.shadow.blur || 5
                    ctx.shadowOffsetX = t.shadow.offsetX || 2
                    ctx.shadowOffsetY = t.shadow.offsetY || 2
                }

                if (t.stroke) {
                    ctx.strokeStyle = t.strokeColor || "#000"
                    ctx.lineWidth = t.strokeWidth || 2
                    ctx.strokeText(text, t.x, t.y)
                }

                ctx.fillText(text, t.x, t.y)
            }

            if (layer.type === "shape") {
                const s = layer.data

                ctx.fillStyle = s.color || "#5865F2"
                ctx.strokeStyle = s.strokeColor || "#fff"
                ctx.lineWidth = s.strokeWidth || 2

                ctx.beginPath()
                ctx.arc(
                    s.x + s.width / 2,
                    s.y + s.height / 2,
                    s.width / 2,
                    0,
                    Math.PI * 2
                )

                if (s.fill) ctx.fill()
                ctx.stroke()
            }

            ctx.restore()
        }

        // ===== AVATAR =====
        const avatarLayer = template.layers.find(
            (l: any) => l.type === "shape" && l.name?.toLowerCase().includes("avatar")
        )

        if (avatarLayer && data.avatarUrl) {
            try {
                const avatar = await loadImage(data.avatarUrl)
                const s = avatarLayer.data

                ctx.save()
                ctx.beginPath()
                ctx.arc(
                    s.x + s.width / 2,
                    s.y + s.height / 2,
                    s.width / 2,
                    0,
                    Math.PI * 2
                )
                ctx.clip()

                ctx.drawImage(avatar, s.x, s.y, s.width, s.height)
                ctx.restore()
            } catch (err) {
                console.error("Erro avatar:", err)
            }
        }
    }

    return canvas.toBuffer("image/png")
}