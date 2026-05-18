import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setConcurrency(1)
// Higher CRF = smaller file. 23 is the Remotion default; the training
// content is mostly text + a portrait so we can crank it a bit without
// visible loss.
Config.setCrf(26)
