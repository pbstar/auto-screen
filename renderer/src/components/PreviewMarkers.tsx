import type { DragRange, ImagePoint } from './preview-types'

interface Props {
  picked: ImagePoint | null
  dragRange: DragRange | null
  imageWidth: number
  imageHeight: number
  displayWidth: number
  displayHeight: number
}

export default function PreviewMarkers({
  picked,
  dragRange,
  imageWidth,
  imageHeight,
  displayWidth,
  displayHeight,
}: Props) {
  const px = (x: number) => (x / imageWidth) * displayWidth
  const py = (y: number) => (y / imageHeight) * displayHeight

  return (
    <g>
      {dragRange && (
        <g>
          <line
            x1={px(dragRange.start.x)}
            y1={py(dragRange.start.y)}
            x2={px(dragRange.end.x)}
            y2={py(dragRange.end.y)}
            stroke="#ffb300"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <circle
            cx={px(dragRange.start.x)}
            cy={py(dragRange.start.y)}
            r={5}
            fill="none"
            stroke="#ffb300"
            strokeWidth={2}
          />
          <circle
            cx={px(dragRange.end.x)}
            cy={py(dragRange.end.y)}
            r={5}
            fill="none"
            stroke="#ffb300"
            strokeWidth={2}
          />
        </g>
      )}

      {picked && (
        <g>
          <circle
            cx={px(picked.x)}
            cy={py(picked.y)}
            r={7}
            fill="none"
            stroke="#ff1744"
            strokeWidth={2}
          />
          <line
            x1={px(picked.x) - 12}
            y1={py(picked.y)}
            x2={px(picked.x) + 12}
            y2={py(picked.y)}
            stroke="#ff1744"
            strokeWidth={1}
          />
          <line
            x1={px(picked.x)}
            y1={py(picked.y) - 12}
            x2={px(picked.x)}
            y2={py(picked.y) + 12}
            stroke="#ff1744"
            strokeWidth={1}
          />
        </g>
      )}
    </g>
  )
}
