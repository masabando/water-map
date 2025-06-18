import { useEffect, useReducer, useRef, useState } from 'react'
import './App.css'
import NoiseJS from 'noisejs'
import { init } from '@masabando/easy-three'

function App() {
  const ref = useRef(null)
  const noiseDetailRef = useRef(null)
  const noise = useRef(new NoiseJS.Noise(Math.random()))
  const [noiseDetail, setNoiseDetail] = useState(60)
  const ctxRef = useRef(null)
  const [normalMapStrength, setNormalMapStrength] = useState(4.0)
  const normalMapStrengthRef = useRef(null)
  const divRef = useRef(null)
  const easyThreeRef = useRef(null)
  const [dataURL, setDataURL] = useState("")
  const noiseDetailTimeout = useRef(null)
  const normalMapStrengthTimeout = useRef(null)
  const [stop, setStop] = useState(false)
  const [updateCount, updateCountDispatch] = useReducer((state => state + 1), 0)

  useEffect(() => {
    const canvas = ref.current
    ctxRef.current = canvas.getContext('2d')
  }, [])

  // function seamlessNoise2D(x, y, scale, noiseFunc) {
  //   const s = scale
  //   const nx = Math.cos((x * 2 * Math.PI) / s)
  //   const ny = Math.sin((y * 2 * Math.PI) / s)
  //   const nz = Math.sin((x * 2 * Math.PI) / s) + Math.cos((y * 2 * Math.PI) / s)
  //   return noiseFunc.perlin3(nx, ny, nz)
  // }
  function seamlessNoise2D(x, y, scale, noiseFunc) {
    const nx = Math.cos((x * 2 * Math.PI) / scale)
    const ny = Math.sin((x * 2 * Math.PI) / scale)
    const nz = Math.cos((y * 2 * Math.PI) / scale)
    const nt = Math.sin((y * 2 * Math.PI) / scale)
    return (
      0.6 * noiseFunc.perlin3(nx, ny, nz) +
      0.4 * noiseFunc.perlin3(nx * 1.8, ny * 0.5, nt * 1.2)
    )
  }

  useEffect(() => {
    const canvas = ref.current
    const ctx = ctxRef.current

    // background(255)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // draw the noise
    // for (let x = 0; x < canvas.width; x++) {
    //   for (let y = 0; y < canvas.height; y++) {
    //     //const value = noise.current.perlin2(x / noiseDetail, y / noiseDetail)
    //     const value = seamlessNoise2D(x, y, noiseDetail, noise.current)
    //     const colorValue = Math.floor((value + 1) * 128) // Normalize to [0, 255]
    //     ctx.fillStyle = `rgb(${colorValue}, ${colorValue}, ${colorValue})`
    //     ctx.fillRect(x, y, 1, 1)
    //   }
    // }
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        const scale = noiseDetail

        const hL = seamlessNoise2D(x - 1, y, scale, noise.current)
        const hR = seamlessNoise2D(x + 1, y, scale, noise.current)
        const hU = seamlessNoise2D(x, y - 1, scale, noise.current)
        const hD = seamlessNoise2D(x, y + 1, scale, noise.current)

        const dx = (hR - hL) * normalMapStrength
        const dy = (hD - hU) * normalMapStrength

        // 法線ベクトル (x, y, z)
        const normal = [-dx, -dy, 1.0]
        const length = Math.hypot(...normal)
        const nx = normal[0] / length
        const ny = normal[1] / length
        const nz = normal[2] / length

        // [-1, 1] -> [0, 255] に変換
        const r = Math.floor((nx * 0.5 + 0.5) * 255)
        const g = Math.floor((ny * 0.5 + 0.5) * 255)
        const b = Math.floor((nz * 0.5 + 0.5) * 255)

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(x, y, 1, 1)

      }
      setDataURL(canvas.toDataURL('image/png'))
    }

    // eslint-disable-next-line
  }, [updateCount])

  useEffect(() => {
    const { camera, create, animate, controls, destroy } = init(divRef.current)
    easyThreeRef.current = { camera, create }
    controls.connect();
    controls.enableZoom = false;
    create.ambientLight();
    create.directionalLight();
    camera.position.set(0, 6, 10)
    const cube = create.cube({ size: 2 });
    create.sky();
    const ocean = create.ocean(dataURL, {
      textureSize: 128
    })
    animate(({ delta, time }) => {
      cube.rotation.x += delta * 0.8
      cube.rotation.y += delta
      cube.position.y = Math.sin(time) * 2 + 3
      ocean.update(delta)
    });
    setStop(false)
    return () => {
      destroy()
    }
  }, [dataURL])

  return (
    <>
      <div className="navbar bg-base-100 shadow-sm sticky top-0 z-50">
        <a className="btn btn-ghost text-xl">water-map</a>
      </div>
      <div className="flex flex-col justify-center items-center mt-2 gap-4 p-4 pb-20">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Noise Detail : {noiseDetail}</span>
          </label>
          <input
            disabled={stop}
            ref={noiseDetailRef}
            type="range" min={10} max={160} defaultValue={noiseDetail}
            className="range range-primary w-full"
            onChange={(e) => {
              if (noiseDetailTimeout.current) {
                clearTimeout(noiseDetailTimeout.current)
              }
              const value = parseInt(e.target.value, 10)
              setNoiseDetail(value)
              noiseDetailTimeout.current = setTimeout(() => {
                setStop(true)
                setTimeout(() => {
                  updateCountDispatch()
                }, 100)
                noise.current = new NoiseJS.Noise(Math.random())
              }, 100)
            }}
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">NormalMap Strength : {normalMapStrength}</span>
          </label>
          <input
            disabled={stop}
            ref={normalMapStrengthRef}
            type="range" min={0.5} max={10} step={0.02} defaultValue={normalMapStrength}
            className="range range-secondary w-full"
            onChange={(e) => {
              if (normalMapStrengthTimeout.current) {
                clearTimeout(normalMapStrengthTimeout.current)
              }
              const value = parseFloat(e.target.value)
              setNormalMapStrength(value)
              normalMapStrengthTimeout.current = setTimeout(() => {
                setStop(true)
                setTimeout(() => {
                  updateCountDispatch()
                }, 100)
              }, 100)
            }}
          />
        </div>
        <canvas
          ref={ref}
          width={512} height={512}
          className="border max-w-full"
        />
        <div
          ref={divRef}
          style={{
            width: '200px',
            aspectRatio: '1',
            maxWidth: '100%',
            border: '1px solid #ccc'
          }}></div>
        <button
          className="btn btn-secondary mt-4"
          onClick={() => {
            const canvas = ref.current
            const link = document.createElement('a')
            link.download = 'water-map.png'
            link.href = canvas.toDataURL('image/png')
            link.click()
          }}
        >
          Download Water Map
        </button>
      </div>
    </>
  )
}

export default App
