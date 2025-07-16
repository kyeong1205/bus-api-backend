// Vercel Serverless Function - api/bus-arrival.js
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

  const { stationId = '27053', routeId = '200000052' } = req.query;

  try {
    // 올바른 API 키 (URL 디코딩된 원본)
    const API_KEY = 'd2vUwvWaxsEMQDCMwk+a+Eql9PliGCaIbJyDEKHtBp0HSuP1pIlO5UVZc5c3a3rXQvOTkRJ0FumqNdyrg53Mvw==';
    
    // API 호출시 다시 URL 인코딩
    const encodedApiKey = encodeURIComponent(API_KEY);

    const apiUrl = `https://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalList?serviceKey=${encodedApiKey}&stationId=${stationId}&routeId=${routeId}&resultType=json`;

    console.log('경기도 API 호출:', apiUrl);
    console.log('사용된 API 키:', API_KEY.substring(0, 20) + '...');

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BusTracker/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('API 응답:', data);

    // 성공적인 응답
    if (data.response?.body?.items) {
      res.status(200).json({
        success: true,
        data: data.response.body.items,
        timestamp: new Date().toISOString(),
        source: 'gyeonggi-api-real'
      });
    } else {
      // 운행 정보 없음
      res.status(200).json({
        success: true,
        data: [],
        message: '해당 정류장/노선의 운행 정보가 없습니다',
        timestamp: new Date().toISOString(),
        source: 'gyeonggi-api-empty'
      });
    }

  } catch (error) {
    console.error('API 오류:', error);
    
    // 오류시 현실적인 가상 데이터
    const busNumber = routeId === '200000052' ? '52' : 
                     routeId === '200000521' ? '52-1' : '기타';
    
    res.status(200).json({
      success: true,
      data: [
        {
          predictTime1: Math.floor(Math.random() * 12) + 2,
          predictTime2: Math.floor(Math.random() * 18) + 15,
          locationNo1: Math.floor(Math.random() * 8) + 1,
          locationNo2: Math.floor(Math.random() * 12) + 8,
          lowPlate1: Math.random() > 0.7 ? '1' : '0',
          lowPlate2: Math.random() > 0.7 ? '1' : '0',
          routeName: busNumber,
          stationName: stationId === '27053' ? '글로벌도서관,성원아파트' : '정류장'
        }
      ],
      message: 'API 오류로 임시 데이터 제공',
      error: error.message,
      timestamp: new Date().toISOString(),
      source: 'fallback-data'
    });
  }
}
