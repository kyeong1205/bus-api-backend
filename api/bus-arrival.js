// api/bus-arrival.js - 2개 루트 지원 버전

export default async function handler(req, res) {
  // 강화된 CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { route = 'all' } = req.query;

  try {
    console.log('=== 다중 루트 버스 정보 조회 ===');
    console.log('요청된 루트:', route);

    const API_KEY = 'd2vUwvWaxsEMQDCMwk+a+Eql9PliGCaIbJyDEKHtBp0HSuP1pIlO5UVZc5c3a3rXQvOTkRJ0FumqNdyrg53Mvw==';
    const encodedApiKey = encodeURIComponent(API_KEY);

    // 루트별 정류장 및 버스 설정
    const routes = {
      route1: {
        name: '52번 + 52-1번',
        stationId: '226000012',
        stationName: '글로벌도서관,성원아파트',
        buses: [
          { name: '52', routeId: '208000030' },
          { name: '52-1', routeId: '208000035' }
        ]
      },
      route2: {
        name: '441번 + 502번 + 22번 + 51번', 
        stations: [
          {
            stationId: '226000046',
            stationName: '정류장2',
            buses: [
              { name: '441', routeId: '100100070' },
              { name: '502', routeId: '100100410' }
            ]
          },
          {
            stationId: '209000026',
            stationName: '22번 정류장',
            buses: [
              { name: '22', routeId: '208000029' }
            ]
          },
          {
            stationId: '226000135',
            stationName: '51번 정류장',
            buses: [
              { name: '51', routeId: '208000017' }
            ]
          }
        ]
      },
      route3: {
        name: '10번 + 6-1번',
        stations: [
          {
            stationId: '226000046',
            stationName: '정류장2',
            buses: [
              { name: '10', routeId: '208000025' }
            ]
          },
          {
            stationId: '209000086',
            stationName: '6-1번 정류장',
            buses: [
              { name: '6-1', routeId: '241252001' }
            ]
          }
        ]
      }
    };

    const allRouteData = [];

    // 요청된 루트에 따라 API 호출
    const routesToFetch = route === 'all' ? Object.keys(routes) : [route];

    for (const routeKey of routesToFetch) {
      if (!routes[routeKey]) continue;

      const routeConfig = routes[routeKey];
      console.log(`${routeConfig.name} 정보 조회 중...`);

      // route1 방식 (기존 단일 정류장)
      if (routeConfig.stationId) {
        try {
          const apiUrl = `https://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalListv2?serviceKey=${encodedApiKey}&stationId=${routeConfig.stationId}&format=json`;
          
          const response = await fetch(apiUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.response?.msgBody?.busArrivalList) {
              const allBuses = data.response.msgBody.busArrivalList;
              
              // 디버깅: 모든 버스 정보 출력
              console.log(`=== 전체 버스 목록 (${routeConfig.stationId}) ===`);
              allBuses.forEach((bus, index) => {
                console.log(`${index + 1}. ${bus.routeName} (ID: ${bus.routeId}) → ${bus.routeDestName}`);
              });
              console.log('==================');
              
              // 해당 루트의 버스들만 필터링
              const targetBuses = allBuses.filter(bus => {
                const isMatch = routeConfig.buses.some(configBus => 
                  bus.routeName === configBus.name || 
                  String(bus.routeId) === String(configBus.routeId)
                );
                if (isMatch) {
                  console.log(`✅ 매칭된 버스: ${bus.routeName} (${bus.routeId})`);
                }
                return isMatch;
              });

              console.log(`전체 버스 수: ${allBuses.length}, 필터링된 버스 수: ${targetBuses.length}`);

              // 데이터 정리
              const cleanBuses = targetBuses.map(bus => ({
                routeKey: routeKey,
                routeName: bus.routeName,
                routeDestName: bus.routeDestName,
                predictTime1: bus.predictTime1 || 0,
                predictTime2: bus.predictTime2 || 0,
                locationNo1: bus.locationNo1 || 0,
                locationNo2: bus.locationNo2 || 0,
                lowPlate1: bus.lowPlate1 === 1 ? '1' : '0',
                lowPlate2: bus.lowPlate2 === 1 ? '1' : '0',
                plateNo1: bus.plateNo1 || '',
                plateNo2: bus.plateNo2 || '',
                crowded1: bus.crowded1,
                crowded2: bus.crowded2,
                stationId: routeConfig.stationId,
                stationName: routeConfig.stationName
              }));

              if (cleanBuses.length > 0) {
                allRouteData.push({
                  routeKey: routeKey,
                  routeName: routeConfig.name,
                  stationId: routeConfig.stationId,
                  stationName: routeConfig.stationName,
                  buses: cleanBuses
                });
                console.log(`✅ ${routeConfig.name}: ${cleanBuses.length}개 버스 정보 수집`);
              }
            }
          }
        } catch (routeError) {
          console.error(`${routeConfig.name} 오류:`, routeError.message);
        }
      }
      
      // route2 방식 (다중 정류장)
      if (routeConfig.stations) {
        const allStationBuses = [];
        
        for (const station of routeConfig.stations) {
          try {
            const apiUrl = `https://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalListv2?serviceKey=${encodedApiKey}&stationId=${station.stationId}&format=json`;
            
            const response = await fetch(apiUrl);
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.response?.msgBody?.busArrivalList) {
                const allBuses = data.response.msgBody.busArrivalList;
                
                console.log(`=== ${station.stationName} (${station.stationId}) 버스 목록 ===`);
                allBuses.forEach((bus, index) => {
                  console.log(`${index + 1}. ${bus.routeName} (ID: ${bus.routeId}) → ${bus.routeDestName}`);
                });
                
                // 해당 정류장의 버스들만 필터링
                const targetBuses = allBuses.filter(bus => {
                  const isMatch = station.buses.some(configBus => 
                    bus.routeName === configBus.name || 
                    String(bus.routeId) === String(configBus.routeId)
                  );
                  if (isMatch) {
                    console.log(`✅ 매칭된 버스: ${bus.routeName} (${bus.routeId}) at ${station.stationName}`);
                  }
                  return isMatch;
                });

                // 데이터 정리
                const cleanBuses = targetBuses.map(bus => ({
                  routeKey: routeKey,
                  routeName: bus.routeName,
                  routeDestName: bus.routeDestName,
                  predictTime1: bus.predictTime1 || 0,
                  predictTime2: bus.predictTime2 || 0,
                  locationNo1: bus.locationNo1 || 0,
                  locationNo2: bus.locationNo2 || 0,
                  lowPlate1: bus.lowPlate1 === 1 ? '1' : '0',
                  lowPlate2: bus.lowPlate2 === 1 ? '1' : '0',
                  plateNo1: bus.plateNo1 || '',
                  plateNo2: bus.plateNo2 || '',
                  crowded1: bus.crowded1,
                  crowded2: bus.crowded2,
                  stationId: station.stationId,
                  stationName: station.stationName
                }));

                allStationBuses.push(...cleanBuses);
              }
            }
          } catch (stationError) {
            console.error(`${station.stationName} 오류:`, stationError.message);
          }
        }
        
        if (allStationBuses.length > 0) {
          allRouteData.push({
            routeKey: routeKey,
            routeName: routeConfig.name,
            buses: allStationBuses
          });
          console.log(`✅ ${routeConfig.name}: ${allStationBuses.length}개 버스 정보 수집 (다중 정류장)`);
        }
      }
    }

    // 실제 데이터가 있으면 반환
    if (allRouteData.length > 0) {
      res.status(200).json({
        success: true,
        data: allRouteData,
        timestamp: new Date().toISOString(),
        source: 'gyeonggi-real-api',
        totalRoutes: allRouteData.length
      });
    } else {
      // 데이터 없으면 가상 데이터
      console.log('실제 데이터 없음, 가상 데이터 생성');
      
      const mockData = [];
      
      if (route === 'all' || route === 'route1') {
        mockData.push({
          routeKey: 'route1',
          routeName: '52번 + 52-1번',
          stationId: '226000012',
          stationName: '글로벌도서관,성원아파트',
          buses: [
            {
              routeKey: 'route1',
              routeName: '52',
              routeDestName: '창박골',
              predictTime1: Math.floor(Math.random() * 15) + 3,
              predictTime2: Math.floor(Math.random() * 25) + 18,
              locationNo1: Math.floor(Math.random() * 10) + 2,
              locationNo2: Math.floor(Math.random() * 15) + 8,
              lowPlate1: '1',
              lowPlate2: '1',
              plateNo1: '경기71바' + Math.floor(Math.random() * 9999),
              plateNo2: '경기71바' + Math.floor(Math.random() * 9999),
              crowded1: 1,
              crowded2: 0,
              stationId: '226000012',
              stationName: '글로벌도서관,성원아파트'
            },
            {
              routeKey: 'route1',
              routeName: '52-1',
              routeDestName: '더샵센트럴시티정문',
              predictTime1: Math.floor(Math.random() * 20) + 5,
              predictTime2: 0,
              locationNo1: Math.floor(Math.random() * 12) + 3,
              locationNo2: 0,
              lowPlate1: '0',
              lowPlate2: '0',
              plateNo1: '경기71바' + Math.floor(Math.random() * 9999),
              plateNo2: '',
              crowded1: 1,
              crowded2: 0,
              stationId: '226000012',
              stationName: '글로벌도서관,성원아파트'
            }
          ]
        });
      }

      if (route === 'all' || route === 'route2') {
        mockData.push({
          routeKey: 'route2',
          routeName: '441번 + 502번 + 22번 + 51번',
          buses: [
            {
              routeKey: 'route2',
              routeName: '441',
              routeDestName: '신사역1번출구',
              predictTime1: Math.floor(Math.random() * 12) + 2,
              predictTime2: Math.floor(Math.random() * 18) + 10,
              locationNo1: Math.floor(Math.random() * 8) + 1,
              locationNo2: Math.floor(Math.random() * 12) + 5,
              lowPlate1: '1',
              lowPlate2: '1',
              plateNo1: '서울70사' + Math.floor(Math.random() * 9999),
              plateNo2: '서울74사' + Math.floor(Math.random() * 9999),
              crowded1: 0,
              crowded2: 0,
              stationId: '226000046',
              stationName: '정류장2'
            },
            {
              routeKey: 'route2',
              routeName: '502',
              routeDestName: '한국은행.신세계앞',
              predictTime1: Math.floor(Math.random() * 10) + 4,
              predictTime2: Math.floor(Math.random() * 15) + 12,
              locationNo1: Math.floor(Math.random() * 6) + 2,
              locationNo2: Math.floor(Math.random() * 10) + 8,
              lowPlate1: '1',
              lowPlate2: '1',
              plateNo1: '서울70사' + Math.floor(Math.random() * 9999),
              plateNo2: '서울70사' + Math.floor(Math.random() * 9999),
              crowded1: 0,
              crowded2: 0,
              stationId: '226000046',
              stationName: '정류장2'
            },
            {
              routeKey: 'route2',
              routeName: '22',
              routeDestName: '덕장초교',
              predictTime1: Math.floor(Math.random() * 15) + 3,
              predictTime2: Math.floor(Math.random() * 25) + 15,
              locationNo1: Math.floor(Math.random() * 8) + 2,
              locationNo2: Math.floor(Math.random() * 12) + 8,
              lowPlate1: '0',
              lowPlate2: '0',
              plateNo1: '경기71바' + Math.floor(Math.random() * 9999),
              plateNo2: '경기71바' + Math.floor(Math.random() * 9999),
              crowded1: 1,
              crowded2: 1,
              stationId: '209000026',
              stationName: '22번 정류장'
            },
            {
              routeKey: 'route2',
              routeName: '51',
              routeDestName: '평촌차고지',
              predictTime1: Math.floor(Math.random() * 12) + 4,
              predictTime2: Math.floor(Math.random() * 18) + 12,
              locationNo1: Math.floor(Math.random() * 6) + 1,
              locationNo2: Math.floor(Math.random() * 10) + 6,
              lowPlate1: '0',
              lowPlate2: '0',
              plateNo1: '경기71바' + Math.floor(Math.random() * 9999),
              plateNo2: '경기71바' + Math.floor(Math.random() * 9999),
              crowded1: 1,
              crowded2: 1,
              stationId: '226000135',
              stationName: '51번 정류장'
            }
          ]
        });
      }

      if (route === 'all' || route === 'route3') {
        mockData.push({
          routeKey: 'route3',
          routeName: '10번 + 6-1번',
          buses: [
            {
              routeKey: 'route3',
              routeName: '10',
              routeDestName: '창박골',
              predictTime1: Math.floor(Math.random() * 12) + 2,
              predictTime2: Math.floor(Math.random() * 20) + 8,
              locationNo1: Math.floor(Math.random() * 6) + 2,
              locationNo2: Math.floor(Math.random() * 10) + 5,
              lowPlate1: '1',
              lowPlate2: '1',
              plateNo1: '경기71바' + Math.floor(Math.random() * 9999),
              plateNo2: '경기71바' + Math.floor(Math.random() * 9999),
              crowded1: 1,
              crowded2: 1,
              stationId: '226000046',
              stationName: '정류장2'
            },
            {
              routeKey: 'route3',
              routeName: '6-1',
              routeDestName: '한림대병원',
              predictTime1: Math.floor(Math.random() * 10) + 3,
              predictTime2: 0,
              locationNo1: Math.floor(Math.random() * 8) + 2,
              locationNo2: 0,
              lowPlate1: '1',
              lowPlate2: '0',
              plateNo1: '경기71바' + Math.floor(Math.random() * 9999),
              plateNo2: '',
              crowded1: 0,
              crowded2: 0,
              stationId: '209000086',
              stationName: '6-1번 정류장'
            }
          ]
        });
      }

      res.status(200).json({
        success: true,
        data: mockData,
        message: 'API 오류로 가상 데이터 제공',
        timestamp: new Date().toISOString(),
        source: 'fallback-data',
        totalRoutes: mockData.length
      });
    }

  } catch (error) {
    console.error('=== 전체 API 호출 실패 ===');
    console.error('오류:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
