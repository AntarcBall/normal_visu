지금 내 연구는 itsc진단 이상탐지 연구인데, train,val에 class zero(정상 모터)데이터만 쓸 수 있고 test에서는 class 1~6(1,3이 고장 정도가 낮아서 가장 판별 어려움, 다른 class는 판별 쉬워서 테스트 시에 배제할 수도 있음, 어차피 실제로 고장 데이터를 얻을 수 없다는 가정하에 모델이 잘 학습되어야 업계 수준에서 의의를 가진다고 보기 때문에 class 0 이외에는 학습에 사용할 수 없으므로... 아무튼 데이터들은 여러 프로퍼티를 가지면서 데이터 공간 안에 각각 csv로 존재하는데,freq=약 10 가지 load=2 가지 고장 정도=3가지 ->(load,고장 정도를 묶으면 class 1~6) 이렇게 있고 각 csv에는 4채널이 있는데 3상 모터+
3) 10만 포인트는 통째로 넣지 말고, “사이클 기준 window”로 자르세요

주파수가 여러 값이면 window를 샘플 수 기준 고정보다 전기적 cycle 기준으로 잡는 게 낫습니다. 이유는 같은 4096포인트라도 주파수마다 포함된 cycle 수가 달라져서, 모델이 fault보다 주파수 차이를 먼저 학습할 수 있기 때문입니다. anomaly detection 자체도 보통 길이 w의 subsequence/window를 입력으로 정의하고, 재구성 계열은 sliding window로 만든 training window를 사용합니다. PatchTST 계열의 patching도 contiguous patch가 local semantics를 보존하면서 긴 history를 다루는 데 유리하다고 설명합니다.

실무 시작점은 이렇게 잡으면 됩니다.
L = round(C * fs / fe)
여기서 fs는 sampling rate, fe는 해당 CSV의 electrical frequency, C는 cycle 수입니다.
처음 grid는 C ∈ {8, 16, 32} 로 잡고, 첫 베이스라인은 16 cycles 를 권합니다. ITSC 쪽은 harmonic/imbalance를 보려면 너무 짧아도 안 되고, subtle transient도 놓치면 안 되기 때문입니다. 주파수 영역과 시간 영역을 동시에 잡기 어렵다는 점은 FCVAE류 연구에서도 지적됩니다.
2) 정규화는 “채널별, train-normal-only, CSV 안에서 공동정규화 금지”부터 시작하세요

질문에 바로 답하면, A/B/C 3채널을 한꺼번에 묶어서 CSV 내부에서 정규화하는 건 비추천입니다. 멀티변량 시계열에서는 채널 간 상호작용이 중요하고, 최근 channel normalization 연구도 채널별 identity가 모델에서 구분되어야 한다고 말합니다. 채널별 affine parameter가 없으면 동일 입력에 대해 채널 특성이 흐려질 수 있다는 문제의식도 제시합니다. 즉 전류 A/B/C는 “그냥 숫자 3개”가 아니라 의미가 다른 상이므로, 최소한 정규화 통계는 채널별로 분리하는 게 안전합니다.

기본 베이스라인은 이것입니다.
scaler[c] = fit(train_normal의 모든 window에서 채널 c만 모아 계산)
그리고 val/test에는 그 scaler를 그대로 transform만 합니다. StandardScaler는 train에서 평균/표준편차를 배우고 test에 재적용하는 전형적인 방법이고, MaxAbsScaler는 zero-centered 데이터에 맞고 feature를 [-1,1] 범위로 맞춥니다. outlier성 스파이크가 많으면 RobustScaler도 후보입니다.

중요한 건 per-window z-score를 기본값으로 두지 말라는 점입니다. ITSC 쪽은 absolute amplitude, imbalance, harmonic magnitude 자체가 fault cue일 수 있습니다. 문헌에서는 stator current fault harmonics가 증가한다고 하고, 2×supply frequency 성분이나 3rd harmonic ratio 같은 지표가 fault indicator로 사용됩니다. 게다가 같은 fault severity라도 harmonic magnitude가 operating condition에 따라 바뀔 수 있다고 보고합니다. per-window z-score는 이런 절대 크기 정보를 약하게 만들 수 있습니다. 동시에, normalization 비교 연구는 z-normalization이 언제나 최선이 아니며, 다른 scaling이 더 나은 경우가 많다고 보여줍니다. SAN도 거친 global normalization이 distinct pattern을 손상시킬 수 있다고 지적합니다.

그래서 내 권고는 단일 정규화 하나로 끝내지 말고, “dual-view”로 가는 것입니다.
첫 번째 view는 amplitude-preserving global/channel-wise scaling 입니다.
두 번째 view는 shape 위주 branch 입니다. 이 branch만 per-window z-score 또는 detrend/high-pass residual을 써도 됩니다.
이렇게 하면 한 branch는 “절대 진폭/imbalance/하모닉 크기”를 보존하고, 다른 branch는 “파형 shape”를 봅니다. 정규화 비교 논문들이 “no single best”를 시사하므로, 이 이원화가 실제로 가장 실용적입니다.