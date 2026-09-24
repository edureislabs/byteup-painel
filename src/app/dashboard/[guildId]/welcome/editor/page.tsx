"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"

// ========== TIPOS ==========
interface Shadow {
    enabled: boolean
    color: string
    blur: number
    offsetX: number
    offsetY: number
}

interface Layer {
    id: string
    type: "text" | "shape"
    name: string
    visible: boolean
    locked: boolean
    opacity: number
    zIndex: number
    blendMode: string
    data: any
}

interface TextData {
    text: string
    x: number
    y: number
    fontSize: number
    color: string
    fontFamily: string
    bold: boolean
    italic: boolean
    underline: boolean
    stroke?: boolean
    strokeColor?: string
    strokeWidth?: number
    shadow: Shadow
    opacity: number
    rotation: number
    scale: number
}

interface ShapeData {
    shape: "circle"
    x: number
    y: number
    width: number
    height: number
    color: string
    fill: boolean
    strokeColor: string
    strokeWidth: number
    rotation: number
    opacity: number
    shadow: Shadow
}

interface Template {
    width: number
    height: number
    background: {
        type: "color" | "image" | "gradient"
        color?: string
        image?: string
        gradient?: {
            type: "linear" | "radial"
            start: string
            end: string
            angle: number
        }
    }
    layers: Layer[]
}

// ========== CONSTANTES ==========
const FONTS = ["sans-serif", "serif", "monospace", "Arial", "Georgia", "Verdana", "Tahoma", "Courier New", "Impact", "Comic Neue"]
const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"]

// ========== FUNÇÕES PADRÃO ==========
const getDefaultLayers = (): Layer[] => [
    {
        id: "1",
        type: "text",
        name: "Título",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 2,
        blendMode: "normal",
        data: {
            text: "BEM-VINDO(A)!",
            x: 230,
            y: 80,
            fontSize: 22,
            color: "#5865F2",
            fontFamily: "sans-serif",
            bold: true,
            italic: false,
            underline: false,
            stroke: false,
            strokeColor: "#000000",
            strokeWidth: 2,
            shadow: { enabled: false, color: "#000000", blur: 5, offsetX: 2, offsetY: 2 },
            opacity: 1,
            rotation: 0,
            scale: 1
        } as TextData
    },
    {
        id: "2",
        type: "text",
        name: "Username",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 3,
        blendMode: "normal",
        data: {
            text: "{username}",
            x: 230,
            y: 125,
            fontSize: 28,
            color: "#ffffff",
            fontFamily: "sans-serif",
            bold: true,
            italic: false,
            underline: false,
            stroke: false,
            strokeColor: "#000000",
            strokeWidth: 2,
            shadow: { enabled: false, color: "#000000", blur: 5, offsetX: 2, offsetY: 2 },
            opacity: 1,
            rotation: 0,
            scale: 1
        } as TextData
    },
    {
        id: "3",
        type: "text",
        name: "Mensagem",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 4,
        blendMode: "normal",
        data: {
            text: "{message}",
            x: 230,
            y: 165,
            fontSize: 16,
            color: "#b9bbbe",
            fontFamily: "sans-serif",
            bold: false,
            italic: false,
            underline: false,
            stroke: false,
            strokeColor: "#000000",
            strokeWidth: 2,
            shadow: { enabled: false, color: "#000000", blur: 5, offsetX: 2, offsetY: 2 },
            opacity: 1,
            rotation: 0,
            scale: 1
        } as TextData
    },
    {
        id: "4",
        type: "shape",
        name: "Avatar",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 1,
        blendMode: "normal",
        data: {
            shape: "circle",
            x: 45,
            y: 45,
            width: 130,
            height: 130,
            color: "#5865F2",
            fill: true,
            strokeColor: "#ffffff",
            strokeWidth: 4,
            rotation: 0,
            opacity: 1,
            shadow: { enabled: true, color: "#000000", blur: 10, offsetX: 2, offsetY: 2 }
        } as ShapeData
    }
]

const getDefaultTemplate = (): Template => ({
    width: 800,
    height: 350,
    background: {
        type: "color",
        color: "#23272a"
    },
    layers: getDefaultLayers()
})

// ========== COMPONENTE PRINCIPAL ==========
export default function WelcomeEditor() {
    const params = useParams()
    const router = useRouter()
    const guildId = params.guildId as string
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileImageRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const bgImageInputRef = useRef<HTMLInputElement>(null)

    const [template, setTemplate] = useState<Template>(getDefaultTemplate())
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
    const [dragging, setDragging] = useState<{ type: string; layerId: string; offsetX: number; offsetY: number } | null>(null)
    const [zoom, setZoom] = useState(1)
    const [activeTab, setActiveTab] = useState<"camadas" | "propriedades" | "efeitos" | "background">("camadas")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showGrid, setShowGrid] = useState(true)
    const [snapToGrid, setSnapToGrid] = useState(true)
    const [gridSize, setGridSize] = useState(10)

    const updateLayer = (id: string, updates: Partial<Layer>) => {
        setTemplate(prev => ({
            ...prev,
            layers: prev.layers.map(l => l.id === id ? { ...l, ...updates } : l)
        }))
    }

    // ========== DESENHAR CANVAS ==========
    const draw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = template.width * zoom
        canvas.height = template.height * zoom
        ctx.scale(zoom, zoom)

        ctx.clearRect(0, 0, template.width, template.height)

        // ========== FUNDO ==========
        try {
            if (template.background.type === "color") {
                ctx.fillStyle = template.background.color || "#23272a"
                ctx.fillRect(0, 0, template.width, template.height)
            } 
            else if (template.background.type === "image" && template.background.image) {
                const img = new Image()
                img.src = template.background.image
                if (img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, 0, 0, template.width, template.height)
                } else {
                    ctx.fillStyle = "#23272a"
                    ctx.fillRect(0, 0, template.width, template.height)
                    img.onload = () => draw()
                }
            }
            else if (template.background.type === "gradient" && template.background.gradient) {
                const startColor = template.background.gradient.start || "#5865F2"
                const endColor = template.background.gradient.end || "#eb459e"
                
                let grad
                if (template.background.gradient.type === "linear") {
                    const angle = template.background.gradient.angle || 0
                    const rad = (angle * Math.PI) / 180
                    const x1 = Math.cos(rad) * template.width
                    const y1 = Math.sin(rad) * template.height
                    grad = ctx.createLinearGradient(0, 0, x1, y1)
                } else {
                    grad = ctx.createRadialGradient(
                        template.width / 2, template.height / 2, 0,
                        template.width / 2, template.height / 2, template.width / 2
                    )
                }
                grad.addColorStop(0, startColor)
                grad.addColorStop(1, endColor)
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, template.width, template.height)
            }
            else {
                ctx.fillStyle = "#23272a"
                ctx.fillRect(0, 0, template.width, template.height)
            }
        } catch (error) {
            console.error("Erro ao desenhar fundo:", error)
            ctx.fillStyle = "#23272a"
            ctx.fillRect(0, 0, template.width, template.height)
        }

        // ========== GRADE ==========
        if (showGrid) {
            ctx.save()
            ctx.strokeStyle = "#ffffff33"
            ctx.lineWidth = 1
            for (let x = 0; x < template.width; x += gridSize) {
                ctx.beginPath()
                ctx.moveTo(x, 0)
                ctx.lineTo(x, template.height)
                ctx.stroke()
            }
            for (let y = 0; y < template.height; y += gridSize) {
                ctx.beginPath()
                ctx.moveTo(0, y)
                ctx.lineTo(template.width, y)
                ctx.stroke()
            }
            ctx.restore()
        }

        // ========== ORDENAR LAYERS ==========
        const sortedLayers = [...template.layers].sort((a, b) => a.zIndex - b.zIndex)

        // ========== DESENHAR TODOS OS ELEMENTOS ==========
        sortedLayers.forEach(layer => {
            if (!layer.visible) return

            ctx.save()
            ctx.globalAlpha = layer.opacity
            ctx.globalCompositeOperation = layer.blendMode as any

            if (layer.type === "text") {
                const textData = layer.data as TextData
                
                ctx.save()
                ctx.translate(textData.x, textData.y)
                ctx.rotate((textData.rotation * Math.PI) / 180)
                ctx.scale(textData.scale, textData.scale)
                ctx.translate(-textData.x, -textData.y)
                
                let fontStyle = ""
                if (textData.bold) fontStyle += "bold "
                if (textData.italic) fontStyle += "italic "
                fontStyle += `${textData.fontSize}px ${textData.fontFamily || "sans-serif"}`
                ctx.font = fontStyle
                ctx.fillStyle = textData.color || "#ffffff"
                
                if (textData.shadow?.enabled) {
                    ctx.shadowColor = textData.shadow.color || "#000000"
                    ctx.shadowBlur = textData.shadow.blur || 5
                    ctx.shadowOffsetX = textData.shadow.offsetX || 2
                    ctx.shadowOffsetY = textData.shadow.offsetY || 2
                }
                
                if (textData.stroke) {
                    ctx.strokeStyle = textData.strokeColor || "#000000"
                    ctx.lineWidth = textData.strokeWidth || 2
                    ctx.strokeText(textData.text || "", textData.x, textData.y)
                }
                
                ctx.fillText(textData.text || "", textData.x, textData.y)
                ctx.restore()

                if (selectedLayerId === layer.id) {
                    ctx.save()
                    ctx.strokeStyle = "#5865F2"
                    ctx.lineWidth = 2
                    ctx.setLineDash([5, 5])
                    const metrics = ctx.measureText(textData.text || "")
                    ctx.strokeRect(
                        textData.x - 5,
                        textData.y - textData.fontSize - 5,
                        metrics.width + 10,
                        textData.fontSize + 10
                    )
                    ctx.restore()
                }
            } 
            else if (layer.type === "shape") {
                const shapeData = layer.data as ShapeData
                
                ctx.save()
                ctx.translate(shapeData.x + shapeData.width / 2, shapeData.y + shapeData.height / 2)
                ctx.rotate((shapeData.rotation * Math.PI) / 180)
                ctx.translate(-(shapeData.x + shapeData.width / 2), -(shapeData.y + shapeData.height / 2))
                
                if (shapeData.shadow?.enabled) {
                    ctx.shadowColor = shapeData.shadow.color || "#000000"
                    ctx.shadowBlur = shapeData.shadow.blur || 5
                    ctx.shadowOffsetX = shapeData.shadow.offsetX || 2
                    ctx.shadowOffsetY = shapeData.shadow.offsetY || 2
                }
                
                if (shapeData.fill) {
                    ctx.fillStyle = shapeData.color || "#5865F2"
                }
                ctx.strokeStyle = shapeData.strokeColor || "#ffffff"
                ctx.lineWidth = shapeData.strokeWidth || 2
                
                ctx.beginPath()
                ctx.arc(
                    shapeData.x + shapeData.width / 2, 
                    shapeData.y + shapeData.height / 2, 
                    shapeData.width / 2, 
                    0, 
                    Math.PI * 2
                )
                if (shapeData.fill) ctx.fill()
                ctx.stroke()
                
                ctx.restore()

                if (selectedLayerId === layer.id) {
                    ctx.save()
                    ctx.strokeStyle = "#5865F2"
                    ctx.lineWidth = 2
                    ctx.setLineDash([5, 5])
                    ctx.strokeRect(
                        shapeData.x - 5,
                        shapeData.y - 5,
                        shapeData.width + 10,
                        shapeData.height + 10
                    )
                    ctx.restore()
                }
            }
            ctx.restore()
        })

        // ========== DESENHAR ÍCONE DO AVATAR POR CIMA ==========
        const avatarLayer = template.layers.find(l => l.type === "shape" && l.visible)
        if (avatarLayer) {
            const shapeData = avatarLayer.data as ShapeData
            
            ctx.save()
            ctx.beginPath()
            ctx.arc(
                shapeData.x + shapeData.width / 2, 
                shapeData.y + shapeData.height / 2, 
                shapeData.width / 2, 
                0, 
                Math.PI * 2
            )
            ctx.clip()
            
            ctx.fillStyle = "#ffffff"
            ctx.font = `${shapeData.width * 0.5}px "Segoe UI Emoji", sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText("👤", shapeData.x + shapeData.width / 2, shapeData.y + shapeData.height / 2)
            
            ctx.restore()
        }
        
    }, [template, selectedLayerId, zoom, showGrid, gridSize])

    useEffect(() => { draw() }, [draw])

    // ========== CARREGAR TEMPLATE ==========
    useEffect(() => {
        async function loadTemplate() {
            try {
                setLoading(true)
                const response = await fetch(`/api/guilds/${guildId}/welcome`)
                const data = await response.json()
                
                if (data.welcome?.templateJson) {
                    const t = JSON.parse(data.welcome.templateJson)
                    setTemplate({
                        width: t.width || 800,
                        height: t.height || 350,
                        background: t.background || { type: "color", color: "#23272a" },
                        layers: Array.isArray(t.layers) ? t.layers : getDefaultLayers()
                    })
                }
            } catch (error) {
                console.error("Erro:", error)
            } finally {
                setLoading(false)
            }
        }
        loadTemplate()
    }, [guildId])

    // ========== FUNÇÕES DE LAYER ==========
    const addTextLayer = () => {
        const newId = Date.now().toString()
        const newLayer: Layer = {
            id: newId,
            type: "text",
            name: `Texto ${template.layers.filter(l => l.type === "text").length + 1}`,
            visible: true,
            locked: false,
            opacity: 1,
            zIndex: template.layers.length,
            blendMode: "normal",
            data: {
                text: "Novo texto",
                x: 100,
                y: 100,
                fontSize: 18,
                color: "#ffffff",
                fontFamily: "sans-serif",
                bold: false,
                italic: false,
                underline: false,
                stroke: false,
                strokeColor: "#000000",
                strokeWidth: 2,
                shadow: { enabled: false, color: "#000000", blur: 5, offsetX: 2, offsetY: 2 },
                opacity: 1,
                rotation: 0,
                scale: 1
            } as TextData
        }
        
        setTemplate(prev => ({
            ...prev,
            layers: [...prev.layers, newLayer]
        }))
        setSelectedLayerId(newId)
    }

    const deleteLayer = (id: string) => {
        const layerToDelete = template.layers.find(l => l.id === id)
        
        if (layerToDelete?.name === "Avatar") {
            if (confirm("Tem certeza que deseja remover o avatar? Você pode adicioná-lo novamente resetando o template.")) {
                setTemplate(prev => ({
                    ...prev,
                    layers: prev.layers.filter(l => l.id !== id)
                }))
                if (selectedLayerId === id) setSelectedLayerId(null)
            }
        } else {
            setTemplate(prev => ({
                ...prev,
                layers: prev.layers.filter(l => l.id !== id)
            }))
            if (selectedLayerId === id) setSelectedLayerId(null)
        }
    }

    const duplicateLayer = (id: string) => {
        const layer = template.layers.find(l => l.id === id)
        
        if (layer && layer.name === "Avatar") {
            alert("O avatar não pode ser duplicado!")
            return
        }
        
        if (layer) {
            const newLayer = JSON.parse(JSON.stringify(layer))
            newLayer.id = Date.now().toString()
            newLayer.name = `${layer.name} (cópia)`
            newLayer.zIndex = template.layers.length
            setTemplate(prev => ({
                ...prev,
                layers: [...prev.layers, newLayer]
            }))
        }
    }

    const moveLayer = (id: string, direction: "up" | "down") => {
        const sortedLayers = [...template.layers].sort((a, b) => a.zIndex - b.zIndex)
        const index = sortedLayers.findIndex(l => l.id === id)
        
        if (direction === "up" && index < sortedLayers.length - 1) {
            const currentLayer = sortedLayers[index]
            const aboveLayer = sortedLayers[index + 1]
            setTemplate(prev => ({
                ...prev,
                layers: prev.layers.map(l => {
                    if (l.id === currentLayer.id) return { ...l, zIndex: aboveLayer.zIndex }
                    if (l.id === aboveLayer.id) return { ...l, zIndex: currentLayer.zIndex }
                    return l
                })
            }))
        } else if (direction === "down" && index > 0) {
            const currentLayer = sortedLayers[index]
            const belowLayer = sortedLayers[index - 1]
            setTemplate(prev => ({
                ...prev,
                layers: prev.layers.map(l => {
                    if (l.id === currentLayer.id) return { ...l, zIndex: belowLayer.zIndex }
                    if (l.id === belowLayer.id) return { ...l, zIndex: currentLayer.zIndex }
                    return l
                })
            }))
        }
    }

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("layerId", id)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        const sourceId = e.dataTransfer.getData("layerId")
        if (sourceId === targetId) return
        
        const sourceIndex = template.layers.findIndex(l => l.id === sourceId)
        const targetIndex = template.layers.findIndex(l => l.id === targetId)
        if (sourceIndex === -1 || targetIndex === -1) return
        
        const newLayers = [...template.layers]
        const [movedLayer] = newLayers.splice(sourceIndex, 1)
        newLayers.splice(targetIndex, 0, movedLayer)
        
        const updatedLayers = newLayers.map((layer, idx) => ({ ...layer, zIndex: idx }))
        setTemplate(prev => ({ ...prev, layers: updatedLayers }))
    }

    const resetTemplate = () => {
        if (confirm("Tem certeza que deseja resetar o template para o padrão?")) {
            setTemplate(getDefaultTemplate())
            setSelectedLayerId(null)
        }
    }

    const updateTextData = (id: string, updates: Partial<TextData>) => {
        setTemplate(prev => ({
            ...prev,
            layers: prev.layers.map(l => {
                if (l.id === id && l.type === "text") {
                    const currentData = l.data as TextData
                    return {
                        ...l,
                        data: {
                            ...currentData,
                            ...updates,
                            shadow: updates.shadow ? { ...currentData.shadow, ...updates.shadow } : currentData.shadow
                        }
                    }
                }
                return l
            })
        }))
    }

    const updateShapeData = (id: string, updates: Partial<ShapeData>) => {
        setTemplate(prev => ({
            ...prev,
            layers: prev.layers.map(l => {
                if (l.id === id && l.type === "shape") {
                    const currentData = l.data as ShapeData
                    return {
                        ...l,
                        data: {
                            ...currentData,
                            ...updates,
                            shadow: updates.shadow ? { ...currentData.shadow, ...updates.shadow } : currentData.shadow
                        }
                    }
                }
                return l
            })
        }))
    }

    const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        if (file.size > 5 * 1024 * 1024) {
            setError("Imagem muito grande. Máximo 5MB")
            return
        }
        
        const reader = new FileReader()
        reader.onload = (ev) => {
            const src = ev.target?.result as string
            setTemplate(prev => ({
                ...prev,
                background: {
                    type: "image",
                    image: src,
                    color: "#23272a"
                }
            }))
        }
        reader.readAsDataURL(file)
    }

    // ========== MOUSE EVENTS ==========
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!
        const rect = canvas.getBoundingClientRect()
        const scaleX = template.width / (rect.width / zoom)
        const scaleY = template.height / (rect.height / zoom)
        const mx = (e.clientX - rect.left) * scaleX
        const my = (e.clientY - rect.top) * scaleY

        const reversedLayers = [...template.layers].reverse()
        for (const layer of reversedLayers) {
            if (!layer.visible || layer.locked) continue
            
            if (layer.type === "text") {
                const data = layer.data as TextData
                const canvas2d = canvas.getContext("2d")!
                canvas2d.font = `${data.bold ? "bold " : ""}${data.italic ? "italic " : ""}${data.fontSize}px ${data.fontFamily}`
                const w = canvas2d.measureText(data.text).width
                if (mx >= data.x - 10 && mx <= data.x + w + 10 && my >= data.y - data.fontSize - 10 && my <= data.y + 20) {
                    setSelectedLayerId(layer.id)
                    setDragging({ type: "text", layerId: layer.id, offsetX: mx - data.x, offsetY: my - data.y })
                    return
                }
            } else if (layer.type === "shape") {
                const data = layer.data as ShapeData
                if (mx >= data.x - 10 && mx <= data.x + data.width + 10 && my >= data.y - 10 && my <= data.y + data.height + 10) {
                    setSelectedLayerId(layer.id)
                    setDragging({ type: "shape", layerId: layer.id, offsetX: mx - data.x, offsetY: my - data.y })
                    return
                }
            }
        }
        setSelectedLayerId(null)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!dragging) return
        const canvas = canvasRef.current!
        const rect = canvas.getBoundingClientRect()
        const scaleX = template.width / (rect.width / zoom)
        const scaleY = template.height / (rect.height / zoom)
        let mx = (e.clientX - rect.left) * scaleX
        let my = (e.clientY - rect.top) * scaleY

        if (snapToGrid) {
            mx = Math.round(mx / gridSize) * gridSize
            my = Math.round(my / gridSize) * gridSize
        }

        const layer = template.layers.find(l => l.id === dragging.layerId)
        if (!layer) return

        if (layer.type === "text") {
            updateTextData(dragging.layerId, { x: mx - dragging.offsetX, y: my - dragging.offsetY })
        } else if (layer.type === "shape") {
            updateShapeData(dragging.layerId, { x: mx - dragging.offsetX, y: my - dragging.offsetY })
        }
    }

    const handleMouseUp = () => setDragging(null)

    // ========== EXPORTAR/IMPORTAR ==========
    const exportTemplate = () => {
        const dataStr = JSON.stringify(template, null, 2)
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
        const link = document.createElement("a")
        link.setAttribute("href", dataUri)
        link.setAttribute("download", `template-${guildId}-${Date.now()}.json`)
        link.click()
    }

    const importTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string)
                setTemplate(imported)
                setError(null)
            } catch {
                setError("Erro ao importar template")
            }
        }
        reader.readAsText(file)
    }

    const exportAsImage = async () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const link = document.createElement("a")
        link.download = `welcome-${Date.now()}.png`
        link.href = canvas.toDataURL()
        link.click()
    }

    // ========== SALVAR (VERSÃO ANTIGA - APENAS templateJson) ==========
    const salvar = async () => {
  setSaving(true);
  setError(null);
  try {
    const response = await fetch(`/api/guilds/${guildId}/welcome`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateJson: JSON.stringify(template),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao salvar: ${errorText}`);
    }

    console.log("✅ Template salvo (apenas template)!");
    setSaved(true);
    setTimeout(() => router.push(`/dashboard/${guildId}/welcome`), 1500);
  } catch (error: any) {
    setError(error.message);
  } finally {
    setSaving(false);
  }
};
    const selectedLayer = template.layers.find(l => l.id === selectedLayerId)

    if (loading) return <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">Carregando...</div>

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-[#0e0e0e] text-white">
            <aside className="w-full md:w-80 bg-[#1a1a1a] flex flex-col h-auto md:h-full overflow-y-auto">
                <div className="p-4 border-b border-[#333]">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Voltar</button>
                        <span className="font-bold">Editor</span>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="bg-[#333] px-3 py-1 rounded">-</button>
                        <span className="text-sm">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="bg-[#333] px-3 py-1 rounded">+</button>
                        <button onClick={() => setZoom(1)} className="bg-[#333] px-3 py-1 rounded text-xs">100%</button>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                            Grade
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
                            Snap
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button onClick={addTextLayer} className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm py-2 rounded"> Adicionar Texto</button>
                        <button onClick={exportTemplate} className="bg-[#2b2b2b] hover:bg-[#3b3b3b] text-sm py-2 rounded"> Exportar</button>
                        <label className="bg-[#2b2b2b] hover:bg-[#3b3b3b] text-sm py-2 rounded text-center cursor-pointer">
                             Importar JSON
                            <input type="file" accept=".json" className="hidden" onChange={importTemplate} />
                        </label>
                        <button onClick={exportAsImage} className="bg-[#2b2b2b] hover:bg-[#3b3b3b] text-sm py-2 rounded"> Exportar PNG</button>
                        <button onClick={resetTemplate} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm py-2 rounded col-span-2"> Resetar Template</button>
                    </div>

                    <div className="flex gap-1 bg-[#0e0e0e] rounded-lg p-1">
                        {[
                            { id: "camadas", label: " Camadas" },
                            { id: "propriedades", label: " Propriedades" },
                            { id: "efeitos", label: " Efeitos" },
                            { id: "background", label: " Fundo" }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-2 text-xs rounded-lg transition-colors ${activeTab === tab.id ? "bg-[#5865F2]" : "text-gray-400"}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                    {activeTab === "camadas" && (
                        <div className="space-y-2">
                            <div className="flex gap-2 mb-3">
                                <button onClick={addTextLayer} className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs py-1.5 rounded">➕ Adicionar Texto</button>
                            </div>
                            
                            {[...template.layers].sort((a, b) => b.zIndex - a.zIndex).map((layer) => (
                                <div
                                    key={layer.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, layer.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, layer.id)}
                                    className={`p-3 rounded-lg cursor-move transition-colors ${
                                        selectedLayerId === layer.id ? "bg-[#5865F2] border-2 border-[#5865F2]" : "bg-[#0e0e0e] hover:bg-[#252525] border-2 border-transparent"
                                    }`}
                                    onClick={() => setSelectedLayerId(layer.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="cursor-grab text-gray-400">⋮⋮</div>
                                            <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }) }} className="text-lg">
                                                {layer.visible ? "👁️" : "👁️‍🗨️"}
                                            </button>
                                            <span className={`text-sm truncate max-w-[100px] ${layer.locked ? "text-gray-500" : "text-white"}`}>
                                                {layer.name}
                                            </span>
                                            <span className="text-xs opacity-50">{layer.type === "text" ? "📝" : "👤"}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "up") }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#333]">↑</button>
                                            <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "down") }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#333]">↓</button>
                                            <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }) }} className={`w-6 h-6 flex items-center justify-center rounded ${layer.locked ? "text-yellow-500" : "text-gray-500"}`}>🔒</button>
                                            {layer.name !== "Avatar" && (
                                                <button onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id) }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#333]">📋</button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id) }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-red-400">🗑️</button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-2 text-xs text-gray-500">
                                        {layer.locked && <span>🔒 Bloqueado</span>}
                                        {layer.opacity < 1 && <span>🔘 Opacidade: {Math.round(layer.opacity * 100)}%</span>}
                                        <span>📍 Z: {layer.zIndex}</span>
                                    </div>
                                </div>
                            ))}
                            {template.layers.length === 0 && (
                                <div className="text-center text-gray-500 py-8">
                                    <p>Nenhuma camada</p>
                                    <button onClick={addTextLayer} className="mt-2 text-[#5865F2] hover:underline text-sm">Clique aqui para adicionar</button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "propriedades" && selectedLayer && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Nome</label>
                                <input type="text" value={selectedLayer.name} onChange={e => updateLayer(selectedLayer.id, { name: e.target.value })}
                                    className="w-full bg-[#0e0e0e] border border-[#333] rounded px-2 py-1 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Opacidade: {Math.round(selectedLayer.opacity * 100)}%</label>
                                <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity}
                                    onChange={e => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
                                    className="w-full" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Modo de mesclagem</label>
                                <select value={selectedLayer.blendMode} onChange={e => updateLayer(selectedLayer.id, { blendMode: e.target.value })}
                                    className="w-full bg-[#0e0e0e] border border-[#333] rounded px-2 py-1 text-sm">
                                    {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={selectedLayer.locked} onChange={e => updateLayer(selectedLayer.id, { locked: e.target.checked })} />
                                <span className="text-sm">Bloqueado</span>
                            </label>

                            {selectedLayer.type === "text" && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Texto</label>
                                        <input type="text" value={(selectedLayer.data as TextData).text}
                                            onChange={e => updateTextData(selectedLayer.id, { text: e.target.value })}
                                            className="w-full bg-[#0e0e0e] border border-[#333] rounded px-2 py-1 text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-gray-400">Tamanho</label>
                                            <input type="number" value={(selectedLayer.data as TextData).fontSize}
                                                onChange={e => updateTextData(selectedLayer.id, { fontSize: Number(e.target.value) })}
                                                className="w-full bg-[#0e0e0e] border border-[#333] rounded px-2 py-1 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400">Fonte</label>
                                            <select value={(selectedLayer.data as TextData).fontFamily}
                                                onChange={e => updateTextData(selectedLayer.id, { fontFamily: e.target.value })}
                                                className="w-full bg-[#0e0e0e] border border-[#333] rounded px-2 py-1 text-sm">
                                                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Cor</label>
                                        <input type="color" value={(selectedLayer.data as TextData).color}
                                            onChange={e => updateTextData(selectedLayer.id, { color: e.target.value })}
                                            className="w-full h-8 rounded cursor-pointer" />
                                    </div>
                                    <div className="flex gap-2">
                                        {[
                                            { field: "bold", label: "N" },
                                            { field: "italic", label: "I" },
                                            { field: "underline", label: "U" }
                                        ].map(({ field, label }) => (
                                            <button key={field} onClick={() => updateTextData(selectedLayer.id, { [field]: !(selectedLayer.data as any)[field] })}
                                                className={`flex-1 py-1 text-sm rounded ${(selectedLayer.data as any)[field] ? "bg-[#5865F2]" : "bg-[#0e0e0e]"}`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Rotação: {(selectedLayer.data as TextData).rotation}°</label>
                                        <input type="range" min={-180} max={180} value={(selectedLayer.data as TextData).rotation}
                                            onChange={e => updateTextData(selectedLayer.id, { rotation: Number(e.target.value) })}
                                            className="w-full" />
                                    </div>
                                </>
                            )}

                            {selectedLayer.type === "shape" && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Largura: {(selectedLayer.data as ShapeData).width}px</label>
                                        <input type="range" min={50} max={200} step={5} value={(selectedLayer.data as ShapeData).width}
                                            onChange={e => updateShapeData(selectedLayer.id, { width: Number(e.target.value), height: Number(e.target.value) })}
                                            className="w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Cor do avatar</label>
                                        <input type="color" value={(selectedLayer.data as ShapeData).color}
                                            onChange={e => updateShapeData(selectedLayer.id, { color: e.target.value })}
                                            className="w-full h-8 rounded cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Cor da borda</label>
                                        <input type="color" value={(selectedLayer.data as ShapeData).strokeColor}
                                            onChange={e => updateShapeData(selectedLayer.id, { strokeColor: e.target.value })}
                                            className="w-full h-8 rounded cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Espessura da borda: {(selectedLayer.data as ShapeData).strokeWidth}px</label>
                                        <input type="range" min={1} max={10} value={(selectedLayer.data as ShapeData).strokeWidth}
                                            onChange={e => updateShapeData(selectedLayer.id, { strokeWidth: Number(e.target.value) })}
                                            className="w-full" />
                                    </div>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={(selectedLayer.data as ShapeData).fill}
                                            onChange={e => updateShapeData(selectedLayer.id, { fill: e.target.checked })} />
                                        <span className="text-sm">Preenchimento</span>
                                    </label>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "efeitos" && selectedLayer && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold">Sombra</h3>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={(selectedLayer.data as any).shadow?.enabled}
                                    onChange={e => {
                                        if (selectedLayer.type === "text") {
                                            updateTextData(selectedLayer.id, { shadow: { ...(selectedLayer.data as TextData).shadow, enabled: e.target.checked } })
                                        } else {
                                            updateShapeData(selectedLayer.id, { shadow: { ...(selectedLayer.data as ShapeData).shadow, enabled: e.target.checked } })
                                        }
                                    }} />
                                <span className="text-sm">Ativar sombra</span>
                            </label>
                            
                            {(selectedLayer.data as any).shadow?.enabled && (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-400">Cor</label>
                                        <input type="color" value={(selectedLayer.data as any).shadow?.color || "#000000"}
                                            onChange={e => {
                                                if (selectedLayer.type === "text") {
                                                    updateTextData(selectedLayer.id, { shadow: { ...(selectedLayer.data as TextData).shadow, color: e.target.value } })
                                                } else {
                                                    updateShapeData(selectedLayer.id, { shadow: { ...(selectedLayer.data as ShapeData).shadow, color: e.target.value } })
                                                }
                                            }}
                                            className="w-full h-8 rounded cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Desfoque: {(selectedLayer.data as any).shadow?.blur || 0}px</label>
                                        <input type="range" min={0} max={20} value={(selectedLayer.data as any).shadow?.blur || 0}
                                            onChange={e => {
                                                if (selectedLayer.type === "text") {
                                                    updateTextData(selectedLayer.id, { shadow: { ...(selectedLayer.data as TextData).shadow, blur: Number(e.target.value) } })
                                                } else {
                                                    updateShapeData(selectedLayer.id, { shadow: { ...(selectedLayer.data as ShapeData).shadow, blur: Number(e.target.value) } })
                                                }
                                            }}
                                            className="w-full" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-gray-400">Offset X</label>
                                            <input type="number" value={(selectedLayer.data as any).shadow?.offsetX || 0}
                                                onChange={e => {
                                                    if (selectedLayer.type === "text") {
                                                        updateTextData(selectedLayer.id, { shadow: { ...(selectedLayer.data as TextData).shadow, offsetX: Number(e.target.value) } })
                                                    } else {
                                                        updateShapeData(selectedLayer.id, { shadow: { ...(selectedLayer.data as ShapeData).shadow, offsetX: Number(e.target.value) } })
                                                    }
                                                }}
                                                className="w-full bg-[#0e0e0e] border border-[#333] rounded px-2 py-1 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400">Offset Y</label>
                                            <input type="number" value={(selectedLayer.data as any).shadow?.offsetY || 0}
                                                onChange={e => {
                                                    if (selectedLayer.type === "text") {
                                                        updateTextData(selectedLayer.id, { shadow: { ...(selectedLayer.data as TextData).shadow, offsetY: Number(e.target.value) } })
                                                    } else {
                                                        updateShapeData(selectedLayer.id, { shadow: { ...(selectedLayer.data as ShapeData).shadow, offsetY: Number(e.target.value) } })
                                                    }
                                                }}
                                                className="w-full bg-[#0e0e0e] border border-[#333] rounded px-2 py-1 text-sm" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedLayer.type === "text" && (
                                <>
                                    <h3 className="text-sm font-semibold mt-4">Contorno</h3>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={(selectedLayer.data as TextData).stroke}
                                            onChange={e => updateTextData(selectedLayer.id, { stroke: e.target.checked })} />
                                        <span className="text-sm">Ativar contorno</span>
                                    </label>
                                    {(selectedLayer.data as TextData).stroke && (
                                        <>
                                            <div>
                                                <label className="text-xs text-gray-400">Cor do contorno</label>
                                                <input type="color" value={(selectedLayer.data as TextData).strokeColor || "#000000"}
                                                    onChange={e => updateTextData(selectedLayer.id, { strokeColor: e.target.value })}
                                                    className="w-full h-8 rounded cursor-pointer" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Espessura: {(selectedLayer.data as TextData).strokeWidth || 2}px</label>
                                                <input type="range" min={1} max={10} value={(selectedLayer.data as TextData).strokeWidth || 2}
                                                    onChange={e => updateTextData(selectedLayer.id, { strokeWidth: Number(e.target.value) })}
                                                    className="w-full" />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "background" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Tipo de fundo</label>
                                <div className="flex gap-2">
                                    {["color", "gradient", "image"].map(type => (
                                        <button key={type} onClick={() => setTemplate(prev => ({ 
                                            ...prev, 
                                            background: { 
                                                ...prev.background, 
                                                type: type as any,
                                                ...(type === "gradient" && !prev.background.gradient ? {
                                                    gradient: {
                                                        type: "linear",
                                                        start: "#5865F2",
                                                        end: "#eb459e",
                                                        angle: 0
                                                    }
                                                } : {})
                                            } 
                                        }))}
                                            className={`flex-1 py-2 rounded-lg text-xs ${template.background.type === type ? "bg-[#5865F2]" : "bg-[#0e0e0e]"}`}>
                                            {type === "color" ? "🎨 Cor" : type === "gradient" ? "🌈 Gradiente" : "🖼️ Imagem"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {template.background.type === "color" && (
                                <div>
                                    <label className="text-xs text-gray-400">Cor</label>
                                    <input type="color" value={template.background.color || "#23272a"}
                                        onChange={e => setTemplate(prev => ({ ...prev, background: { ...prev.background, color: e.target.value } }))}
                                        className="w-full h-10 rounded cursor-pointer mt-1" />
                                </div>
                            )}

                            {template.background.type === "gradient" && (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-400">Tipo</label>
                                        <div className="flex gap-2 mt-1">
                                            {["linear", "radial"].map(type => (
                                                <button key={type} onClick={() => setTemplate(prev => ({ ...prev, background: { ...prev.background, gradient: { ...prev.background.gradient!, type: type as any } } }))}
                                                    className={`flex-1 py-1 rounded text-xs ${template.background.gradient?.type === type ? "bg-[#5865F2]" : "bg-[#0e0e0e]"}`}>
                                                    {type === "linear" ? "Linear" : "Radial"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Cor inicial</label>
                                        <input type="color" value={template.background.gradient?.start || "#5865F2"}
                                            onChange={e => setTemplate(prev => ({ ...prev, background: { ...prev.background, gradient: { ...prev.background.gradient!, start: e.target.value } } }))}
                                            className="w-full h-8 rounded cursor-pointer mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Cor final</label>
                                        <input type="color" value={template.background.gradient?.end || "#eb459e"}
                                            onChange={e => setTemplate(prev => ({ ...prev, background: { ...prev.background, gradient: { ...prev.background.gradient!, end: e.target.value } } }))}
                                            className="w-full h-8 rounded cursor-pointer mt-1" />
                                    </div>
                                    {template.background.gradient?.type === "linear" && (
                                        <div>
                                            <label className="text-xs text-gray-400">Ângulo: {template.background.gradient?.angle || 0}°</label>
                                            <input type="range" min={0} max={360} value={template.background.gradient?.angle || 0}
                                                onChange={e => setTemplate(prev => ({ ...prev, background: { ...prev.background, gradient: { ...prev.background.gradient!, angle: Number(e.target.value) } } }))}
                                                className="w-full" />
                                        </div>
                                    )}
                                </>
                            )}

                            {template.background.type === "image" && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-2">Imagem de fundo</label>
                                    <button
                                        onClick={() => bgImageInputRef.current?.click()}
                                        className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm py-2 rounded transition-colors"
                                    >
                                        📤 Upload de imagem
                                    </button>
                                    {template.background.image && (
                                        <div className="mt-3">
                                            <div className="relative">
                                                <img 
                                                    src={template.background.image} 
                                                    alt="Preview do fundo"
                                                    className="w-full h-24 object-cover rounded-lg"
                                                />
                                                <button
                                                    onClick={() => {
                                                        setTemplate(prev => ({
                                                            ...prev,
                                                            background: { type: "color", color: "#23272a" }
                                                        }))
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">Imagem carregada com sucesso!</p>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">Formatos: JPG, PNG, GIF (max 5MB)</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-[#333]">
                    <button onClick={salvar} disabled={saving}
                        className={`w-full py-3 rounded-lg font-semibold transition-colors ${saved ? "bg-green-500" : "bg-[#5865F2] hover:bg-[#4752c4]"} disabled:opacity-50`}>
                        {saving ? "💾 Salvando..." : saved ? "✅ Salvo!" : "💾 Salvar Template"}
                    </button>
                    {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
                </div>
            </aside>

            <main className="flex-1 p-4 flex items-center justify-center bg-[#0e0e0e]" ref={containerRef}>
                <div className="relative shadow-2xl rounded-xl overflow-auto" style={{ 
                    width: "100%", 
                    height: "calc(100vh - 2rem)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    <canvas
                        ref={canvasRef}
                        width={template.width * zoom}
                        height={template.height * zoom}
                        style={{ 
                            maxWidth: "100%", 
                            maxHeight: "100%",
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                            cursor: dragging ? "grabbing" : "grab"
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>
            </main>

            <input ref={fileImageRef} type="file" accept="image/*" className="hidden" />
            <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundImageUpload} />
        </div>
    )
}