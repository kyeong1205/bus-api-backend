// GitHub에 추가할 새 파일: api/search-route.js
// 버스 번호로 노선 ID를 자동 검색하는 API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { busNumber = '52' } = req.query;

  try {
    const API_KEY = 'd2vUwvWaxsEMQDCMwk+a+Eql9PliGCaIbJyDEKHtBp0HSuP1pIlO5UVZc5c3a3rXQvOTkRJ0FumqNdyrg53Mvw==';
    const encodedApiKey = encodeURIComponent(API_KEY);
    
    // 경기도 버스 노선 검색 API
    const routeSearchUrl = `https://apis.data.go.kr/6410000/busrouteservice/v2/getBusRouteList?serviceKey=${encodedApiKey}&keyword=${busNumber}&resultType=json`;
    
    console.log('노선 검색 API 호출:', routeSearchUrl);

    const response = await fetch(routeSearchUrl);
    
    if (!response.ok) {
      throw new Error(`노선 검색 API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('노선 검색 결과:', data);

    if (data.response?.body?.items) {
      const routes = data.response.body.items;
      
      // 정확히 일치하는 버스 번호 찾기
      const exactMatch = routes.find(route => 
        route.routeName === busNumber || 
        route.routeName === `${busNumber}번`
      );
      
      if (exactMatch) {
        res.status(200).json({
          success: true,
          busNumber: busNumber,
          routeId: exactMatch.routeId,
          routeName: exactMatch.routeName,
          allRoutes: routes.map(r => ({
            routeId: r.routeId,
            routeName: r.routeName,
            startPoint: r.startStationName,
            endPoint: r.endStationName
          }))
        });
      } else {
        res.status(200).json({
          success: false,
          message: `${busNumber}번 버스를 찾을 수 없습니다`,
          allRoutes: routes.map(r => ({
            routeId: r.routeId,
            routeName: r.routeName
          }))
        });
      }
    } else {
      res.status(200).json({
        success: false,
        message: '노선 검색 결과가 없습니다',
        data: data
      });
    }

  } catch (error) {
    console.error('노선 검색 오류:', error);
    
    // 일반적인 경기도 버스 노선 ID들 (추정)
    const commonRouteIds = {
      '52': 'R200000052',  // 추정
      '52-1': 'R200000521', // 추정
      '11-1': 'R200000111',
      '760': 'R200000760'
    };
    
    res.status(200).json({
      success: false,
      message: 'API 오류로 추정 노선 ID 제공',
      busNumber: busNumber,
      estimatedRouteId: commonRouteIds[busNumber] || `R2000000${busNumber}`,
      error: error.message,
      note: '실제 노선 ID와 다를 수 있습니다'
    });
  }
}

// ===========================================
// 사용법:
// ===========================================

/*
1. GitHub에 새 파일 생성: api/search-route.js
2. 위 코드 복사해서 붙여넣기
3. Commit & Push
4. 테스트 URL:
   https://bus-api-backend.vercel.app/api/search-route?busNumber=52
   https://bus-api-backend.vercel.app/api/search-route?busNumber=52-1

응답 예시:
{
  "success": true,
  "busNumber": "52",
  "routeId": "234000001",
  "routeName": "52",
  "allRoutes": [...]
}
*/
