export interface Data {
  timestamp: number
  acc_x: number;
  acc_y: number;
  acc_z: number;
  acc_gx: number;
  acc_gy: number;
  acc_gz: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  gps_lat: number;
  gps_lon: number;
}

export interface PredictionPayload {
  interval: number;
  data: Data[];
}

export interface Probability {
  Halt: number;
  Forward: number;
  Turn: number;
}

export interface PredictionResponse {
  action: string;
  prediction: number;
  probability: Probability;
}
