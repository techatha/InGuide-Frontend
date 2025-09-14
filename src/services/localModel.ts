// services/localModel.ts
import type { PredictionResponse } from '@/types/prediction'
import * as tf from '@tensorflow/tfjs'

let model: tf.GraphModel | null = null

async function loadLocalModel() {
  console.log("attempting load modeel")
  if (!model) {
    model = await tf.loadGraphModel('/tfjs_model/model.json')
    console.log('✅ Model loaded locally')
  }
}

const labels = ['Halt', 'Forward', 'Turn']

export async function predictLocal(features: number[]): Promise<PredictionResponse> {
  if (!model) throw new Error('Model not loaded')
  const input = tf.tensor2d([features]) // shape [1, num_features]

  const prediction = model.predict(input) as tf.Tensor
  const probs = await prediction.data() // Float32Array of probabilities
  const predIndex = prediction.argMax(-1).dataSync()[0]

  const response: PredictionResponse = {
    action: labels[predIndex],
    prediction: predIndex,
    probability: {
      Halt: probs[0] ?? 0,
      Forward: probs[1] ?? 0,
      Turn: probs[2] ?? 0,
    },
  }

  input.dispose()
  prediction.dispose()

  return response
}

export default {
  loadLocalModel,
  predictLocal,
}
