// api/bus-arrival.js - 간단하고 안전한 버전

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { stationId = '226000012' } = req.query;

  try {
    console.log('API 호출 시작, 정류장 ID:', stationId);

    // API 키 설정
    const API_KEY = 'd2vUwvWaxsEMQDCMwk+a+Eql9PliGCaIbJyDEKHtBp0HSuP1pIlO5UVZc5c3a3rXQvOTkRJ0FumqNdyrg53Mvw==';
    const encodedApiKey = encodeURIComponent(API_KEY);
    
    // API URL 구성
    const apiUrl = `https://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalListv2?serviceKey=${encodedApiKey}&stationId=${stationId}&format=json`;
    
    console.log('경기도 API 호출 중...');

    // API 호출
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log('API 응답 오류:', response.status);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('API 응답 받음, 데이터 처리 중...');

    // 응답 데이터 확인
    if (data.response && data.response.msgBody && data.response.msgBody.busArrivalList) {
      const buses = data.response.msgBody.busArrivalList;
      
      // 52번, 52-1번 버스 찾기
      const targetBuses = buses.filter(bus => 
        bus.routeName === '52' || bus.routeName === '52-1'
      );

      // 간단한 형태로 변환
      const simpleBuses = targetBuses.map(bus => ({
        routeName: bus.routeName,
        routeDestName: bus.routeDestName,
        predictTime1: bus.predictTime1 || 0,
        predictTime2: bus.predictTime2 || 0,
        locationNo1: bus.locationNo1 || 0,
        locationNo2: bus.locationNo2 || 0,
        lowPlate1: bus.lowPlate1 === 1 ? '1' : '0',
        lowPlate2: bus.lowPlate2 === 1 ? '1' : '0',
        stationName: '글로벌도서관,성원아파트'
      }));

      console.log('성공: 버스 데이터 반환');
      
      res.status(200).json({
        success: true,
        data: simpleBuses,
        timestamp: new Date().toISOString(),
        source: 'gyeonggi-api-real',
        stationId: stationId
      });

    } else {
      console.log('버스 데이터 없음');
      
      res.status(200).json({
        success: true,
        data: [],
        message: '해당 정류장의 버스 정보가 없습니다',
        timestamp: new Date().toISOString(),
        source: 'gyeonggi-api-empty'
      });
    }

  } catch (error) {
    console.error('오류 발생:', error.message);
    
    // 오류시 가상 데이터 반환
    res.status(200).json({
      success: true,
      data: [
        {
          routeName: '52',
          routeDestName: '창박골',
          predictTime1: Math.floor(Math.random() * 15) + 2,
          predictTime2: Math.floor(Math.random() * 25) + 15,
          locationNo1: Math.floor(Math.random() * 10) + 1,
          locationNo2: Math.floor(Math.random() * 15) + 8,
          lowPlate1: Math.random() > 0.5 ? '1' : '0',
          lowPlate2: Math.random() > 0.5 ? '1' : '0',
          stationName: '글로벌도서관,성원아파트'
        },
        {
          routeName: '52-1',
          routeDestName: '더샵센트럴시티정문',
          predictTime1: Math.floor(Math.random() * 20) + 5,
          predictTime2: Math.floor(Math.random() * 30) + 20,
          locationNo1: Math.floor(Math.random() * 12) + 2,
          locationNo2: Math.floor(Math.random() * 18) + 10,
          lowPlate1: Math.random() > 0.7 ? '1' : '0',
          lowPlate2: Math.random() > 0.7 ? '1' : '0',
          stationName: '글로벌도서관,성원아파트'
        }
      ],
      message: 'API 오류로 가상 데이터 제공',
      error: error.message,
      timestamp: new Date().toISOString(),
      source: 'fallback-data'
    });
  }
}
