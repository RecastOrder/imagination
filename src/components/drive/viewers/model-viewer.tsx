"use client"

import { useEffect, useRef, useState } from "react"
import { EyeIcon, EyeOffIcon, LayersIcon, RotateCcwIcon } from "lucide-react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { extOf } from "@/lib/drive/formats"
import type { ViewerProps } from "./types"

interface LayerInfo {
  index: number
  name: string
  color: string
  visible: boolean
  count: number
}

/**
 * 三维模型：three.js 显示，鼠标左键旋转、右键平移、滚轮缩放。
 * - Rhino .3dm：用 Rhino 官方开源的 rhino3dm（WebAssembly）在浏览器里直接读取，保留图层
 * - STL / OBJ / glTF：three.js 自带的加载器
 * 建筑师习惯 Z 轴向上（和 Rhino 一致），并默认叠加黑色边线，看体块更清楚。
 */
export function ModelViewer({ name, blob }: ViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const api = useRef<{ fit: () => void; setMode: (m: Mode) => void; setLayer: (i: number, v: boolean) => void } | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState("")
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [mode, setMode] = useState<Mode>("shaded")
  const [stats, setStats] = useState<{ objects: number; size: string } | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100000)
    camera.up.set(0, 0, 1)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8278, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.4)
    sun.position.set(-1, -2, 3)
    scene.add(sun)
    const root = new THREE.Group()
    scene.add(root)
    const edgeGroup = new THREE.Group()
    scene.add(edgeGroup)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    let raf = 0
    const tick = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    const fit = () => {
      const box = new THREE.Box3().setFromObject(root)
      if (box.isEmpty()) return
      const c = box.getCenter(new THREE.Vector3())
      const r = box.getSize(new THREE.Vector3()).length() / 2
      const dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))
      camera.position.copy(c).add(new THREE.Vector3(-0.8, -1.2, 0.8).normalize().multiplyScalar(dist))
      camera.near = dist / 1000
      camera.far = dist * 20
      camera.updateProjectionMatrix()
      controls.target.copy(c)
      controls.update()
    }

    const applyStyle = (m: Mode) => {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => ((mat as THREE.MeshStandardMaterial).wireframe = m === "wire"))
      })
      edgeGroup.visible = m === "shaded"
    }

    const finish = (obj: THREE.Object3D) => {
      if (disposed) return
      // 统一材质：没有材质或材质过暗时换成浅灰，像白模
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const cur = mesh.material as THREE.MeshStandardMaterial | undefined
        const color = cur?.color && cur.color.getHSL({ h: 0, s: 0, l: 0 }).l > 0.15 ? cur.color : new THREE.Color(0xd9d4cb)
        mesh.material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), new THREE.LineBasicMaterial({ color: 0x2a2724 }))
        mesh.updateWorldMatrix(true, false)
        edges.applyMatrix4(mesh.matrixWorld)
        edges.userData.source = mesh
        edgeGroup.add(edges)
      })
      root.add(obj)
      const box = new THREE.Box3().setFromObject(root)
      const s = box.getSize(new THREE.Vector3())
      let objects = 0
      obj.traverse((o) => ((o as THREE.Mesh).isMesh || (o as THREE.Line).isLine) && objects++)
      setStats({ objects, size: `${s.x.toFixed(1)} × ${s.y.toFixed(1)} × ${s.z.toFixed(1)}` })
      // 地面网格：放在模型底部
      const grid = new THREE.GridHelper(Math.max(s.x, s.y) * 2 || 10, 20, 0xb8b2a8, 0xd8d3ca)
      grid.rotation.x = Math.PI / 2
      grid.position.set(box.getCenter(new THREE.Vector3()).x, box.getCenter(new THREE.Vector3()).y, box.min.z - 0.01)
      scene.add(grid)
      // 3dm 图层
      const ls = (obj.userData.layers as { name: string; color?: { r: number; g: number; b: number } }[] | undefined) ?? []
      if (ls.length) {
        setLayers(
          ls.map((l, i) => {
            let count = 0
            obj.traverse((o) => o.userData?.attributes?.layerIndex === i && count++)
            return { index: i, name: l.name, color: l.color ? `rgb(${l.color.r},${l.color.g},${l.color.b})` : "gray", visible: true, count }
          }).filter((l) => l.count > 0),
        )
      }
      fit()
      setStatus("ready")
    }

    api.current = {
      fit,
      setMode: applyStyle,
      setLayer: (i, v) => {
        root.traverse((o) => {
          if (o.userData?.attributes?.layerIndex === i) o.visible = v
        })
        edgeGroup.children.forEach((e) => {
          const src = e.userData.source as THREE.Object3D
          if (src?.userData?.attributes?.layerIndex === i) e.visible = v
        })
      },
    }

    const fail = (msg: string) => {
      if (disposed) return
      setError(msg)
      setStatus("error")
    }

    ;(async () => {
      const buf = await blob.arrayBuffer()
      const ext = extOf(name)
      try {
        if (ext === "3dm") {
          const { Rhino3dmLoader } = await import("three/examples/jsm/loaders/3DMLoader.js")
          const loader = new Rhino3dmLoader()
          loader.setLibraryPath("/vendor/rhino3dm/")
          loader.setWorkerLimit(1)
          loader.parse(buf, (o) => finish(o), () => fail("无法读取这个 Rhino 文件。曲面需要在 Rhino 中保存渲染网格才能显示"))
        } else if (ext === "stl") {
          const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js")
          const geo = new STLLoader().parse(buf)
          geo.computeVertexNormals()
          finish(new THREE.Mesh(geo))
        } else if (ext === "obj") {
          const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js")
          finish(new OBJLoader().parse(new TextDecoder().decode(buf)))
        } else {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js")
          new GLTFLoader().parse(buf, "", (g) => finish(g.scene), () => fail("无法读取这个 glTF 文件"))
        }
      } catch {
        fail("模型加载失败，文件可能已损坏")
      }
    })()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose?.()
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
        mats.forEach((x) => x.dispose())
      })
      renderer.dispose()
      renderer.domElement.remove()
      api.current = null
    }
  }, [blob, name])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-1.5">
        <Segmented
          label="显示样式"
          size="sm"
          value={mode}
          onChange={(m) => {
            setMode(m)
            api.current?.setMode(m)
          }}
          options={[
            { value: "shaded", label: "着色 + 边线" },
            { value: "wire", label: "线框" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => api.current?.fit()}>
          <RotateCcwIcon />
          重置视角
        </Button>
        {stats && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {stats.objects} 个对象 · 尺寸 {stats.size}
          </span>
        )}
      </div>
      <div className="relative min-h-0 flex-1 bg-surface-sunken">
        <div ref={hostRef} className="absolute inset-0" aria-label={`${name} 三维预览`} role="img" />
        {status === "loading" && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">正在加载模型…</p>
        )}
        {status === "error" && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">{error}</p>}
        {layers.length > 0 && (
          <div className="absolute top-3 left-3 w-48 rounded-lg border bg-surface/95 p-2 shadow-float backdrop-blur">
            <p className="flex items-center gap-1.5 px-1.5 pb-1.5 text-xs font-medium text-muted-foreground">
              <LayersIcon className="size-3.5" />
              图层
            </p>
            {layers.map((l) => (
              <button
                key={l.index}
                type="button"
                aria-pressed={l.visible}
                onClick={() => {
                  api.current?.setLayer(l.index, !l.visible)
                  setLayers((ls) => ls.map((x) => (x.index === l.index ? { ...x, visible: !x.visible } : x)))
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-accent"
              >
                {/* 图层颜色来自模型文件本身，属于“数据”而非界面样式，所以用内联颜色 */}
                <span className="size-2.5 shrink-0 rounded-sm ring-1 ring-ink/20" style={{ background: l.color }} />
                <span className={l.visible ? "flex-1 truncate" : "flex-1 truncate text-muted-foreground line-through"}>{l.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{l.count}</span>
                {l.visible ? <EyeIcon className="size-3.5 text-muted-foreground" /> : <EyeOffIcon className="size-3.5 text-muted-foreground" />}
              </button>
            ))}
          </div>
        )}
        <p className="pointer-events-none absolute right-3 bottom-3 text-[11px] text-muted-foreground">左键旋转 · 右键平移 · 滚轮缩放</p>
      </div>
    </div>
  )
}

type Mode = "shaded" | "wire"
