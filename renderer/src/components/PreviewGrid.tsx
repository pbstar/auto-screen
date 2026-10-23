import { useMemo } from 'react'
import { GRID, GRID_STYLE, gridMajor } from '@shared/ipc'

interface Props {
  imageWidth: number
  imageHeight: number
  displayWidth: number
  displayHeight: number
  visible: boolean
}

export default function PreviewGrid({
  imageWidth,
  imageHeight,
  displayWidth,
  displayHeight,
  visible,
}: Props) {
  // 和发给模型的标注图用同一套主格步长，人与模型读到的格子一致
  const major = gridMajor(Math.max(imageWidth, imageHeight))

  const majorX = useMemo(() => {
    const values: number[] = []
    for (let x = 0; x <= imageWidth; x += major) values.push(x)
    return values
  }, [imageWidth, major])

  const majorY = useMemo(() => {
    const values: number[] = []
    for (let y = 0; y <= imageHeight; y += major) values.push(y)
    return values
  }, [imageHeight, major])

  const minorStepX = (GRID.minor / imageWidth) * displayWidth
  const minorStepY = (GRID.minor / imageHeight) * displayHeight

  const minorX = useMemo(() => {
    if (minorStepX < 4) return [] as number[]
    const values: number[] = []
    for (let x = 0; x <= imageWidth; x += GRID.minor) values.push(x)
    return values
  }, [imageWidth, minorStepX])

  const minorY = useMemo(() => {
    if (minorStepY < 4) return [] as number[]
    const values: number[] = []
    for (let y = 0; y <= imageHeight; y += GRID.minor) values.push(y)
    return values
  }, [imageHeight, minorStepY])

  if (!visible) return null

  const px = (x: number) => (x / imageWidth) * displayWidth
  const py = (y: number) => (y / imageHeight) * displayHeight
  const showLabels = Math.min(
    (major / imageWidth) * displayWidth,
    (major / imageHeight) * displayHeight,
  ) >= 24

  return (
    <g>
      {majorX.map((x) => (
        <line
          key={`vx-${x}`}
          x1={px(x)}
          y1={0}
          x2={px(x)}
          y2={displayHeight}
          stroke={GRID_STYLE.line}
          strokeWidth={1}
          strokeDasharray={GRID_STYLE.dash.join(' ')}
        />
      ))}
      {majorY.map((y) => (
        <line
          key={`hy-${y}`}
          x1={0}
          y1={py(y)}
          x2={displayWidth}
          y2={py(y)}
          stroke={GRID_STYLE.line}
          strokeWidth={1}
          strokeDasharray={GRID_STYLE.dash.join(' ')}
        />
      ))}

      {minorX.map((x) => (
        <line
          key={`tx-${x}`}
          x1={px(x)}
          y1={0}
          x2={px(x)}
          y2={x % major === 0 ? GRID_STYLE.majorTick : GRID_STYLE.minorTick}
          stroke={GRID_STYLE.tick}
          strokeWidth={1}
        />
      ))}
      {minorY.map((y) => (
        <line
          key={`ty-${y}`}
          x1={0}
          y1={py(y)}
          x2={y % major === 0 ? GRID_STYLE.majorTick : GRID_STYLE.minorTick}
          y2={py(y)}
          stroke={GRID_STYLE.tick}
          strokeWidth={1}
        />
      ))}

      {showLabels &&
        majorX.map((x) => (
          <text
            key={`lx-${x}`}
            x={px(x) + 3}
            y={14}
            fontSize={11}
            fill={GRID_STYLE.label}
            stroke={GRID_STYLE.labelStroke}
            strokeWidth={GRID_STYLE.labelStrokeWidth}
            paintOrder="stroke"
          >
            {x}
          </text>
        ))}
      {showLabels &&
        majorY
          .filter((y) => y > 0)
          .map((y) => (
            <text
              key={`ly-${y}`}
              x={3}
              y={py(y) + 14}
              fontSize={11}
              fill={GRID_STYLE.label}
              stroke={GRID_STYLE.labelStroke}
              strokeWidth={GRID_STYLE.labelStrokeWidth}
              paintOrder="stroke"
            >
              {y}
            </text>
          ))}
    </g>
  )
}
