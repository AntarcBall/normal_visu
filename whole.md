1) 우리 데이터의 계층 구조부터 정확히 적자

원시 데이터의 기본 단위는 csv/run 하나다.
run 인덱스를 
𝑟
r, 채널을 
𝑐
∈
{
1
,
2
,
3
}
c∈{1,2,3}, 원시 시점을 
𝑡
t라고 두면, 한 run은

𝑋
(
𝑟
)
∈
𝑅
𝐶
×
𝑇
𝑟
,
𝐶
=
3
X
(r)
∈R
C×T
rd

,C=3

로 쓸 수 있다.

각 run에는 메타데이터가 붙는다.

𝑚
(
𝑟
)
=
(
𝑓
𝑟
,
  
ℓ
𝑟
,
  
𝑦
𝑟
)
m
(r)
=(f
rd

,ℓ
rd

,y
rd

)

여기서

𝑓
𝑟
f
rd

: 주파수,

ℓ
𝑟
ℓ
rd

: load,

𝑦
𝑟
y
rd

: class label 
(
0
 또는 
1
∼
6
)
(0 또는 1∼6) 이다.

같은 운전조건 클러스터는

𝑔
(
𝑟
)
=
(
𝑓
𝑟
,
ℓ
𝑟
)
g(r)=(f
rd

,ℓ
rd

)

로 묶는다.
즉 네 데이터는

포인트 
→
→ 채널 
→
→ run(csv) 
→
→ 운전조건 클러스터 
→
→ split(train/val/test)

이라는 계층을 가진다.

여기에 windowing이 들어가면, run 
𝑟
r에서 시작점 
𝑠
𝑟
,
𝑤
s
r,wd

, 길이 
𝐿
𝑟
L
rd

인 
𝑤
w번째 window는

𝑋
𝑐
,
𝜏
(
𝑟
,
𝑤
)
=
𝑋
𝑐
,
𝑠
𝑟
,
𝑤
+
𝜏
(
𝑟
)
,
𝜏
=
0
,
…
,
𝐿
𝑟
−
1
X
c,τ
(r,w)d

=X
c,s
r,wd

+τ
(r)d

,τ=0,…,L
rd

−1

가 된다.
그래서 windowing 이후의 기본 샘플은

𝑋
(
𝑟
,
𝑤
)
∈
𝑅
𝐶
×
𝐿
𝑟
X
(r,w)
∈R
C×L
rd


이다.

중요한 점은, 겹치는 window를 쓰면 같은 원시 포인트가 여러 번 복제되어 등장한다는 것이다. 그래서 “정규화를 언제 하느냐”도 후보가 된다. raw run에서 먼저 통계를 잡느냐, window를 자른 뒤 통계를 잡느냐는 서로 다른 연산이다.

2) 정규화는 사실 세 가지를 정하는 문제다

정규화는 결국 아래 셋을 정하는 문제다.

𝑥
~
=
Ψ
(
𝑥
;
𝜃
𝐵
,
𝐴
)
x
~
=Ψ(x;θ
B,Ad

)

여기서

𝐵
B: 통계를 어디서 뽑는가
(전체 train-normal, 같은 운전조건 클러스터, csv/run 하나, window 하나 등)

𝐴
A: 무엇을 한 덩어리로 묶는가
(채널별, 채널을 합쳐서, relative time position별 등)

Ψ
Ψ: 어떤 종류의 정규화인가
(center only, z-score, robust, min-max, max-abs, unit norm 등)

즉 네가 말한 “정규화 시점/덩어리”는 정확히 말하면
(1) 통계의 출처 블록 
𝐵
B 와 (2) 축 묶음 
𝐴
A 의 선택이다.

3) 먼저 ‘정규화 방식’ 가족부터 정리하자

StandardScaler는 훈련 샘플에서 구한 평균과 표준편차로 각 feature를 독립적으로 표준화한다. MinMaxScaler는 훈련셋의 min/max로 지정 범위에 맞추고, MaxAbsScaler는 훈련셋의 최대 절대값을 1로 맞춘다. RobustScaler는 median과 IQR을 쓴다. 또 scikit-learn의 scale(axis=0)은 feature-wise, scale(axis=1)은 sample-wise 표준화이고, normalize(axis=1)은 각 sample의 norm 자체를 맞춘다.

그래서 우리 연구에서 쓸 수 있는 “통계 family”는 아래처럼 정리된다.

(a) no normalization

𝑥
~
=
𝑥
x
~
=x

직관: 원신호를 그대로 본다.
의미: 절대 진폭, 불균형, harmonic magnitude를 하나도 건드리지 않는다.

(b) center only

𝑥
~
=
𝑥
−
𝜇
x
~
=x−μ

직관: DC offset만 제거하고 크기는 남긴다.
의미: “평균 위치만 맞추고 amplitude 정보는 최대한 보존”한다.

(c) z-score

𝑥
~
=
𝑥
−
𝜇
𝜎
+
𝜀
x
~
=
σ+ε
x−μd


직관: 평균 0, 분산 1짜리 자(ruler)로 재는 것.
의미: scale 차이를 줄여 optimizer를 안정화한다.

(d) robust z-score

𝑥
~
=
𝑥
−
med
⁡
IQR
⁡
+
𝜀
x
~
=
IQR+ε
x−medd


직관: 평균/표준편차 대신 median/IQR로 재는 것.
의미: spike/outlier에 덜 흔들린다.

(e) min-max

𝑥
~
=
𝑎
+
(
𝑏
−
𝑎
)
𝑥
−
𝑥
min
⁡
𝑥
max
⁡
−
𝑥
min
⁡
+
𝜀
x
~
=a+(b−a)
x
maxd

−x
mind

+ε
x−x
mind
d


직관: 값 범위를 
[
𝑎
,
𝑏
]
[a,b]에 맞춘다.
의미: bounded input을 만들지만 extrema에 매우 민감하다.

(f) max-abs

𝑥
~
=
𝑥
max
⁡
∣
𝑥
∣
+
𝜀
x
~
=
max∣x∣+ε
xd


직관: 부호는 유지한 채 최대 절대값만 1로 맞춘다.
의미: AC current처럼 0 중심 신호에서 amplitude scale만 줄이고 mean은 건드리지 않는다.

(g) unit-norm / sample normalization

𝑋
~
=
𝑋
∥
𝑋
∥
+
𝜀
X
~
=
∥X∥+ε
Xd


직관: 벡터 길이 자체를 1로 맞춘다.
의미: 방향은 남기고 전체 크기 정보는 거의 없앤다.

4) 이제 핵심인 “정규화 덩어리 후보”를 모두 고르자

아래가 네 연구에서 실제로 의미 있는 정규화 블록 후보 전체다.

4-1) raw run 전체에서, train-normal 전체를 기준으로 하는 정규화

이건 가장 기본적인 후보다.
통계는 class 0의 train run 전체에서만 뽑고, val/test에는 그대로 적용한다.

A. global train-normal, per-channel
𝜇
𝑐
=
∑
𝑟
∈
𝑅
𝑡
𝑟
,
0
∑
𝑡
=
1
𝑇
𝑟
𝑋
𝑐
,
𝑡
(
𝑟
)
∑
𝑟
∈
𝑅
𝑡
𝑟
,
0
𝑇
𝑟
μ
cd

=
∑
r∈R
tr,0d
d

T
rd

∑
r∈R
tr,0d
d

∑
t=1
T
rd
d

X
c,t
(r)d
d

𝑠
𝑐
2
=
∑
𝑟
∈
𝑅
𝑡
𝑟
,
0
∑
𝑡
(
𝑋
𝑐
,
𝑡
(
𝑟
)
−
𝜇
𝑐
)
2
∑
𝑟
∈
𝑅
𝑡
𝑟
,
0
𝑇
𝑟
s
c
2d

=
∑
r∈R
tr,0d
d

T
rd

∑
r∈R
tr,0d
d

∑
td

(X
c,t
(r)d

−μ
cd

)
2d

𝑋
~
𝑐
,
𝑡
(
𝑟
)
=
𝑋
𝑐
,
𝑡
(
𝑟
)
−
𝜇
𝑐
𝑠
𝑐
+
𝜀
X
~
c,t
(r)d

=
s
cd

+ε
X
c,t
(r)d

−μ
cd
d


직관: 채널마다 자를 하나씩 고정하는 방식이다.
의미: A/B/C 각 상은 각각 자기 기준척도로 보되, 그 척도는 모든 train-normal에서 한 번만 배운다.
장점: 누설이 없고, 채널별 sensor scale 차이를 안정화한다.
단점: 채널 간 절대 amplitude ratio는 affine하게 재표현된다.

이게 네 문제에서 가장 표준적인 시작점이다. StandardScaler 자체도 훈련 샘플 기반 feature-wise scaling을 전제로 설명한다.

B. global train-normal, pooled-channel
𝜇
=
∑
𝑟
∈
𝑅
𝑡
𝑟
,
0
∑
𝑐
=
1
𝐶
∑
𝑡
𝑋
𝑐
,
𝑡
(
𝑟
)
𝐶
∑
𝑟
∈
𝑅
𝑡
𝑟
,
0
𝑇
𝑟
μ=
C∑
r∈R
tr,0d
d

T
rd

∑
r∈R
tr,0d
d

∑
c=1
Cd

∑
td

X
c,t
(r)d
d

𝑋
~
𝑐
,
𝑡
(
𝑟
)
=
𝑋
𝑐
,
𝑡
(
𝑟
)
−
𝜇
𝑠
+
𝜀
X
~
c,t
(r)d

=
s+ε
X
c,t
(r)d

−μd


직관: 세 채널이 같은 자 하나를 공유한다.
의미: 채널을 물리적으로 구분하기보다 “같은 단위의 세 측정값”으로 본다.
장점: 채널 간 raw ratio를 더 직접적으로 남기려는 철학과 맞을 수 있다.
단점: 원래 variance가 큰 채널이 optimizer를 지배할 수 있다.

이건 가능한 후보이지만, ITSC처럼 채널 identity가 중요할 때는 보통 per-channel보다 한 단계 더 공격적이다.

4-2) 같은 운전조건 클러스터 
(
𝑓
𝑟
𝑒
𝑞
,
𝑙
𝑜
𝑎
𝑑
)
(freq,load) 안에서 정규화

여기서는 같은 조건 
𝑔
=
(
𝑓
,
ℓ
)
g=(f,ℓ)의 train-normal만 모아서 통계를 만든다.

C. condition-cluster, per-channel
𝜇
𝑔
,
𝑐
=
∑
𝑟
∈
𝑅
𝑡
𝑟
,
0
:
𝑔
(
𝑟
)
=
𝑔
∑
𝑡
𝑋
𝑐
,
𝑡
(
𝑟
)
∑
𝑟
∈
𝑅
𝑡
𝑟
,
0
:
𝑔
(
𝑟
)
=
𝑔
𝑇
𝑟
μ
g,cd

=
∑
r∈R
tr,0d

:g(r)=gd

T
rd

∑
r∈R
tr,0d

:g(r)=gd

∑
td

X
c,t
(r)d
d

𝑋
~
𝑐
,
𝑡
(
𝑟
)
=
𝑋
𝑐
,
𝑡
(
𝑟
)
−
𝜇
𝑔
(
𝑟
)
,
𝑐
𝑠
𝑔
(
𝑟
)
,
𝑐
+
𝜀
X
~
c,t
(r)d

=
s
g(r),cd

+ε
X
c,t
(r)d

−μ
g(r),cd
d


직관: 운전조건마다 채널별 자를 따로 둔다.
의미: health와 operating condition을 분리하고 싶을 때 쓴다.
장점: 주파수/load에 따른 정상 분포 차이를 많이 줄일 수 있다.
단점: 조건별 데이터가 적으면 통계가 불안정하고, 조건 메타데이터가 추론 때도 반드시 필요하다.

D. condition-cluster, pooled-channel
𝑋
~
𝑐
,
𝑡
(
𝑟
)
=
𝑋
𝑐
,
𝑡
(
𝑟
)
−
𝜇
𝑔
(
𝑟
)
𝑠
𝑔
(
𝑟
)
+
𝜀
X
~
c,t
(r)d

=
s
g(r)d

+ε
X
c,t
(r)d

−μ
g(r)d
d


직관: 운전조건마다 공통 자 하나를 쓴다.
의미: 조건 변화는 제거하되 채널 특수성은 덜 반영한다.
장점: 조건 효과는 크게 줄인다.
단점: 채널 identity까지 같이 섞여서 ITSC에는 다소 거칠다.

이 후보군은 “운전조건 차이를 normalization으로 흡수하겠다”는 철학이다. 반대로 “운전조건도 모델이 학습해야 한다”는 철학이면 너무 강할 수 있다.

4-3) csv/run 하나를 자기 자신 기준으로 정규화

이제부터는 통계를 테스트 인스턴스 자체에서 계산한다.

E. run-wise, per-channel
𝜇
𝑟
,
𝑐
=
1
𝑇
𝑟
∑
𝑡
=
1
𝑇
𝑟
𝑋
𝑐
,
𝑡
(
𝑟
)
μ
r,cd

=
T
rd

1d

t=1
∑
T
rd
d

X
c,t
(r)d

𝑋
~
𝑐
,
𝑡
(
𝑟
)
=
𝑋
𝑐
,
𝑡
(
𝑟
)
−
𝜇
𝑟
,
𝑐
𝑠
𝑟
,
𝑐
+
𝜀
X
~
c,t
(r)
	​

=
s
r,c
	​

+ε
X
c,t
(r)
	​

−μ
r,c
	​

	​


직관: csv마다 채널별 자를 새로 뽑는다.
의미: session drift, sensor offset, run-level amplitude shift를 제거한다.
장점: 실험 배치/계측기 드리프트에 강하다.
단점: 그 run 전체의 amplitude나 imbalance가 fault cue면 같이 지워버릴 수 있다.

F. run-wise, pooled-channel
𝜇
𝑟
=
1
𝐶
𝑇
𝑟
∑
𝑐
=
1
𝐶
∑
𝑡
𝑋
𝑐
,
𝑡
(
𝑟
)
μ
r
	​

=
CT
r
	​

1
	​

c=1
∑
C
	​

t
∑
	​

X
c,t
(r)
	​


직관: csv마다 공통 자 하나를 다시 뽑는다.
의미: run-level scale은 없애고, 그 안의 상대적 모양만 본다.
단점: ITSC에서 쓸 만한 절대 진폭 정보를 가장 많이 지울 가능성이 있다.

이 후보군은 “각 run은 자기 내부 구조만 보면 된다”는 철학이다.
즉, absolute amplitude보다 shape-only 쪽으로 모델을 미는 정규화다.

4-4) window를 자른 뒤에 전역 통계를 잡는 정규화

겹치는 window를 만들고 나서 그 window 집합에서 통계를 구하는 방법이다.

G. post-window global, per-channel
𝜇
𝑐
(
win
)
=
∑
𝑟
,
𝑤
∑
𝜏
=
1
𝐿
𝑟
𝑋
𝑐
,
𝜏
(
𝑟
,
𝑤
)
∑
𝑟
𝑁
𝑟
𝐿
𝑟
μ
c
(win)
	​

=
∑
r
	​

N
r
	​

L
r
	​

∑
r,w
	​

∑
τ=1
L
r
	​

	​

X
c,τ
(r,w)
	​

	​


그런데 이건 원시 시점 기준으로 쓰면

𝜇
𝑐
(
win
)
=
∑
𝑟
,
𝑡
𝑚
𝑟
,
𝑡
𝑋
𝑐
,
𝑡
(
𝑟
)
∑
𝑟
,
𝑡
𝑚
𝑟
,
𝑡
μ
c
(win)
	​

=
∑
r,t
	​

m
r,t
	​

∑
r,t
	​

m
r,t
	​

X
c,t
(r)
	​

	​


가 된다. 여기서 
𝑚
𝑟
,
𝑡
m
r,t
	​

는 원시 포인트 
(
𝑟
,
𝑡
)
(r,t)가 몇 개 window에 포함되는지를 뜻한다.

직관: window 샘플링 분포에 맞춰 자를 만든다.
의미: overlap이 크면 중앙부 포인트가 더 큰 가중치를 받는다.
장점: 실제 학습 입력이 window라면 그 분포를 반영한다.
단점: 동일 원시 포인트가 여러 번 세어져 통계가 중복가중된다.

그래서 같은 “global per-channel”이어도
raw 기준과 post-window 기준은 다르다.

4-5) window 자체를 자기 자신 기준으로 정규화

이건 흔히 말하는 instance-wise normalization에 가깝다.

H. window-wise, per-channel
𝜇
𝑟
,
𝑤
,
𝑐
=
1
𝐿
𝑟
∑
𝜏
=
1
𝐿
𝑟
𝑋
𝑐
,
𝜏
(
𝑟
,
𝑤
)
μ
r,w,c
	​

=
L
r
	​

1
	​

τ=1
∑
L
r
	​

	​

X
c,τ
(r,w)
	​

𝑋
~
𝑐
,
𝜏
(
𝑟
,
𝑤
)
=
𝑋
𝑐
,
𝜏
(
𝑟
,
𝑤
)
−
𝜇
𝑟
,
𝑤
,
𝑐
𝑠
𝑟
,
𝑤
,
𝑐
+
𝜀
X
~
c,τ
(r,w)
	​

=
s
r,w,c
	​

+ε
X
c,τ
(r,w)
	​

−μ
r,w,c
	​

	​


직관: window마다 채널별 자를 새로 만든다.
의미: 각 window 안에서 평균과 scale을 제거하고 shape 위주로 본다.
장점: local trend, local amplitude shift를 지우고 모양 비교를 쉽게 한다.
단점: ITSC에서 amplitude/imbalance/harmonic magnitude가 fault cue면 그걸 약하게 만들 수 있다.

I. window-wise, pooled-channel
𝜇
𝑟
,
𝑤
=
1
𝐶
𝐿
𝑟
∑
𝑐
=
1
𝐶
∑
𝜏
=
1
𝐿
𝑟
𝑋
𝑐
,
𝜏
(
𝑟
,
𝑤
)
μ
r,w
	​

=
CL
r
	​

1
	​

c=1
∑
C
	​

τ=1
∑
L
r
	​

	​

X
c,τ
(r,w)
	​


직관: window 하나에 자 하나를 둔다.
의미: window 내부 상대 모양만 최대한 남기고 전체 scale은 버린다.
장점: 채널 전체가 같이 커졌다/작아졌다를 nuisance로 보고 싶을 때만 제한적으로 의미가 있다.
단점: ITSC에는 대개 너무 공격적이다.

scikit-learn에서도 sample-wise standardization과 sample-wise normalization은 axis=1류로 따로 구분된다. 즉 이건 feature-wise train scaling과는 완전히 다른 종류다.

4-6) window 안의 ‘상대 위치’마다 따로 정규화

이건 자주 언급되진 않지만, 수학적으로는 분명한 후보다.

J. position-wise normalization

window를 flatten해서 feature로 보면 각 
(
𝑐
,
𝜏
)
(c,τ)가 별도 feature가 된다.

𝜇
𝑐
,
𝜏
=
1
𝑁
∑
(
𝑟
,
𝑤
)
∈
𝑊
𝑡
𝑟
,
0
𝑋
𝑐
,
𝜏
(
𝑟
,
𝑤
)
μ
c,τ
	​

=
N
1
	​

(r,w)∈W
tr,0
	​

∑
	​

X
c,τ
(r,w)
	​

𝑋
~
𝑐
,
𝜏
(
𝑟
,
𝑤
)
=
𝑋
𝑐
,
𝜏
(
𝑟
,
𝑤
)
−
𝜇
𝑐
,
𝜏
𝑠
𝑐
,
𝜏
+
𝜀
X
~
c,τ
(r,w)
	​

=
s
c,τ
	​

+ε
X
c,τ
(r,w)
	​

−μ
c,τ
	​

	​


직관: window 안의 첫 번째 샘플, 두 번째 샘플, ...이 각각 자기 자를 가진다.
의미: “같은 relative position”이 같은 의미라고 가정한다.
장점: 완전히 위상정렬된 template 신호라면 쓸 수 있다.
단점: 네 데이터처럼 운전조건, 주파수, 시작 위상이 달라질 수 있으면 매우 불안정하다.

즉, 이건 MLP나 flattened-feature 모델에선 자연스럽지만, shift-invariant한 conv 계열에는 보통 덜 자연스럽다.

4-7) 주파수 변환 뒤에 정규화

STFT/FFT/CWT를 쓰면 정규화 블록이 또 생긴다.

K. frequency-bin-wise, global per-channel

주파수 표현을 
𝑆
𝑐
,
𝑘
(
𝑟
,
𝑤
)
S
c,k
(r,w)
	​

라고 두면

𝜇
𝑐
,
𝑘
=
1
𝑁
∑
(
𝑟
,
𝑤
)
∈
𝑊
𝑡
𝑟
,
0
∣
𝑆
𝑐
,
𝑘
(
𝑟
,
𝑤
)
∣
μ
c,k
	​

=
N
1
	​

(r,w)∈W
tr,0
	​

∑
	​

∣S
c,k
(r,w)
	​

∣
𝑆
~
𝑐
,
𝑘
(
𝑟
,
𝑤
)
=
∣
𝑆
𝑐
,
𝑘
(
𝑟
,
𝑤
)
∣
−
𝜇
𝑐
,
𝑘
𝜎
𝑐
,
𝑘
+
𝜀
S
~
c,k
(r,w)
	​

=
σ
c,k
	​

+ε
∣S
c,k
(r,w)
	​

∣−μ
c,k
	​

	​


직관: harmonic bin마다 자를 따로 둔다.
의미: “3배 주파수 성분”, “2배 주파수 성분” 같은 영역을 각자 다른 scale로 본다.
장점: 특정 harmonic이 중요한 문제에서 잘 맞을 수 있다.
단점: 입력이 raw time series가 아니라 spectrogram/FFT branch일 때만 자연스럽다.

L. frequency-bin-wise, instance/window
𝑆
~
𝑐
,
𝑘
(
𝑟
,
𝑤
)
=
∣
𝑆
𝑐
,
𝑘
(
𝑟
,
𝑤
)
∣
−
𝜇
𝑟
,
𝑤
,
𝑐
,
𝑘
-block
𝜎
𝑟
,
𝑤
,
𝑐
,
𝑘
-block
+
𝜀
S
~
c,k
(r,w)
	​

=
σ
r,w,c,k-block
	​

+ε
∣S
c,k
(r,w)
	​

∣−μ
r,w,c,k-block
	​

	​


직관: window마다 스펙트럼 자를 다시 만든다.
의미: shape-only spectrum 비교에 가깝다.
단점: 절대 harmonic magnitude 자체가 fault cue면 역시 지워질 수 있다.

RevIN, SAN, FAN, FredNormer 같은 시계열 정규화 연구는 공통적으로 “instance statistics를 제거/복원하는 방식”이나 “time-domain normalization의 주파수 영역 영향”을 다룬다. RevIN은 per-instance 통계를 제거했다가 복원하는 구조이고, 최근 FredNormer/FAN 계열은 time-domain normalization이 비영 주파수 성분을 일괄적으로 스케일할 수 있다고 지적한다.

5) “채널을 따로 할까, 합칠까?”를 수학적으로 보면

이건 별도 축으로 보는 게 좋다.

(i) per-channel normalization
𝑋
~
𝑐
,
⋅
=
𝑋
𝑐
,
⋅
−
𝜇
𝑐
𝑠
𝑐
+
𝜀
X
~
c,⋅
	​

=
s
c
	​

+ε
X
c,⋅
	​

−μ
c
	​

	​


직관: A/B/C 각각 다른 자를 쓴다.
의미: 채널별 평균/분산 차이를 정리한다.

(ii) pooled-channel normalization
𝑋
~
𝑐
,
⋅
=
𝑋
𝑐
,
⋅
−
𝜇
𝑠
+
𝜀
X
~
c,⋅
	​

=
s+ε
X
c,⋅
	​

−μ
	​


직관: A/B/C가 같은 자 하나를 공유한다.
의미: 채널 전체를 하나의 큰 벡터처럼 본다.

(iii) 왜 per-channel을 해도 “채널 차이 학습”이 가능한가

per-channel scaling은 채널 관계를 “없애는” 게 아니라 고정 상수로 재표현하는 것이다.
예를 들어 채널 
𝑎
,
𝑏
a,b에 대해

𝑥
~
𝑎
=
𝑥
𝑎
−
𝜇
𝑎
𝑠
𝑎
,
𝑥
~
𝑏
=
𝑥
𝑏
−
𝜇
𝑏
𝑠
𝑏
x
~
a
	​

=
s
a
	​

x
a
	​

−μ
a
	​

	​

,
x
~
b
	​

=
s
b
	​

x
b
	​

−μ
b
	​

	​


이므로 채널 관계는 사라지는 게 아니라 각 채널의 고정 ruler로 바뀐 좌표계에서 표현된다.
즉, 정확한 raw ratio는 보존되지 않을 수 있어도, 동기화된 상호관계와 위상차, 비대칭 패턴은 여전히 학습 가능하다.

반대로 pooled-channel은 raw amplitude ratio를 더 직접적으로 남기지만, 큰 분산 채널이 학습을 주도할 수 있다.
그래서 이 문제는 “어느 쪽이 절대적으로 옳다”가 아니라,
채널별 물리 identity를 얼마나 강조할지의 선택이다.

6) “정규화 시점” 자체도 후보라는 점이 중요하다

같은 global per-channel z-score라도 다음 둘은 다르다.

(a) raw run 기준 pre-window normalization
𝜇
𝑐
𝑟
𝑎
𝑤
=
∑
𝑟
,
𝑡
𝑋
𝑐
,
𝑡
(
𝑟
)
∑
𝑟
𝑇
𝑟
μ
c
raw
	​

=
∑
r
	​

T
r
	​

∑
r,t
	​

X
c,t
(r)
	​

	​


직관: 모든 원시 포인트를 한 번씩만 센다.

(b) post-window normalization
𝜇
𝑐
𝑤
𝑖
𝑛
=
∑
𝑟
,
𝑤
,
𝜏
𝑋
𝑐
,
𝜏
(
𝑟
,
𝑤
)
∑
𝑟
𝑁
𝑟
𝐿
𝑟
=
∑
𝑟
,
𝑡
𝑚
𝑟
,
𝑡
𝑋
𝑐
,
𝑡
(
𝑟
)
∑
𝑟
,
𝑡
𝑚
𝑟
,
𝑡
μ
c
win
	​

=
∑
r
	​

N
r
	​

L
r
	​

∑
r,w,τ
	​

X
c,τ
(r,w)
	​

	​

=
∑
r,t
	​

m
r,t
	​

∑
r,t
	​

m
r,t
	​

X
c,t
(r)
	​

	​


직관: 겹치는 window에 많이 들어가는 포인트는 여러 번 센다.

그래서 window overlap이 크면, 정규화 통계 자체가 window sampler의 영향을 받는다.
이건 매우 중요한 차이다.

7) “정규화를 안 하는 것”도 후보로 넣어야 한다

이건 의외로 중요하다.

𝑋
~
=
𝑋
X
~
=X

또는 최소한

𝑋
~
𝑐
,
𝑡
=
𝑋
𝑐
,
𝑡
−
𝜇
𝑐
X
~
c,t
	​

=X
c,td

−μ
cd


만 하는 centering only도 강력한 후보다.

직관: 절대 amplitude를 최대한 보존한다.
의미: ITSC에서 진폭/imbalance/harmonic magnitude가 cue일 수 있다면, 오히려 과한 scaling이 손해일 수 있다.

실제로 distribution shift를 직접 반영하려고 데이터를 아예 normalize/scaling하지 않고 원자료로 평가하는 시계열 연구들도 있다.