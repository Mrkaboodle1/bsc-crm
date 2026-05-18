// Remotion composition registry. Each training module registers a
// Composition keyed by `module.id`. The duration in frames is computed
// from the matching MP3 length by the render script and passed via
// inputProps — keeps the composition pure with no async setup needed.

import React from 'react'
import { Composition } from 'remotion'
import { JackyModule } from './JackyModule'
import { TRAINING_MODULES, type TrainingModule } from './modules'

const FPS = 30
const WIDTH = 1920
const HEIGHT = 1080

export type JackyModuleProps = {
  module: TrainingModule
  // Optional override applied by the render script (frames). Defaults to 75s.
  durationInFrames?: number
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {TRAINING_MODULES.map((mod) => (
        <Composition<JackyModuleProps, JackyModuleProps>
          key={mod.id}
          id={mod.id}
          component={JackyModule}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{ module: mod, durationInFrames: FPS * 60 }}
          durationInFrames={FPS * 60}
          calculateMetadata={async ({ props }) => {
            return {
              durationInFrames: props.durationInFrames ?? FPS * 60,
            }
          }}
        />
      ))}
    </>
  )
}
