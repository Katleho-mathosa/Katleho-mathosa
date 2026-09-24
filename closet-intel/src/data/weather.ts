import type { WeatherScenario } from '../types'

/** Fake weather scenarios (Highveld-style spring swings). Nothing here is live data. */
export const WEATHER_SCENARIOS: WeatherScenario[] = [
  { id: 'swing', label: 'Cold morning → hot afternoon', short: '6° → 26°', minTemp: 6, maxTemp: 26, rain: false, summary: 'Crisp, clear start; warm and dry by lunch.' },
  { id: 'rain', label: 'Rainy', short: '14° rain', minTemp: 12, maxTemp: 15, rain: true, summary: 'Grey skies with afternoon thundershowers.' },
  { id: 'hot', label: 'Hot', short: '31°', minTemp: 19, maxTemp: 31, rain: false, summary: 'Hot and dry, strong sun from 10am.' },
  { id: 'mild', label: 'Mild', short: '12° → 22°', minTemp: 12, maxTemp: 22, rain: false, summary: 'Pleasant, light breeze in the afternoon.' },
]

export function weatherById(id: string): WeatherScenario {
  return WEATHER_SCENARIOS.find((w) => w.id === id) ?? WEATHER_SCENARIOS[0]
}
