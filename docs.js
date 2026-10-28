// 「收藏文件」：玩家在遊戲中拿到的文件，存在伺服器，跟著玩家走過所有場景。
// 每個場景在 act() 回傳 { docs: ['id'] } 就會把對應文件加進那位玩家的收藏。
module.exports = {
  ticket: { id: 'ticket', kind: 'ticket', icon: '🎫', title: '機票', airline: 'China Airlines', flight: 'CI 7Q4X9', airport: 'JFK', to: 'TPE', boarding: '2:00 PM' },
  map: { id: 'map', kind: 'map', icon: '🗺️', title: '紐約地圖' },
  passport: { id: 'passport', kind: 'passport', icon: '🛂', title: '護照', name: 'RACCOONY', country: 'TAIWAN' },
};
