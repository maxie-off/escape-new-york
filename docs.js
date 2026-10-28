// 「收藏文件」：玩家在遊戲中拿到的文件，存在伺服器，跟著玩家走過所有場景。
// 每個場景在 act() 回傳 { docs: ['id'] } 就會把對應文件加進那位玩家的收藏。
const { T } = require('./i18n');
module.exports = {
  ticket: { id: 'ticket', kind: 'ticket', icon: '🎫', title: T('機票', 'Boarding pass'), airline: 'China Airlines', flight: 'CI 7Q4X9', airport: 'JFK', to: 'TPE', boarding: '2:00 PM', note: T('記得登機時間前 2 小時到達機場', 'Arrive at the airport 2 hours before boarding') },
  map: { id: 'map', kind: 'map', icon: '🗺️', title: T('紐約地圖', 'New York map') },
  passport: { id: 'passport', kind: 'passport', icon: '🛂', title: T('護照', 'Passport'), name: 'RACCOONY', country: 'TAIWAN' },
};
