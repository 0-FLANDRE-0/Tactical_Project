# WIP10 reference generator — game tuning values, not real fire-control/ballistic data.
# Produces the tables in TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md section 7 (reference10.json).
# WIP10 reference (game tuning values; not real fire-control/ballistic data).
import math,json
def Phi(x): return 0.5*(1+math.erf(x/math.sqrt(2)))
F=dict(dispersionMrad=.25,layStartMrad=1.5,layMinMrad=.10,layTauSeconds=.6,rangeErrorM=5,muzzleVelocity=1650,velocityRetention=.94,leadResidual=.10,stabMradPerMps=.03)
M=dict(L=7.9248,B=3.6576,Lt=4.75,Bt=3.28,zb=.4826,zh=1.65,zt=2.3749,pivot=(.66,0))
HA=[-2.8,0,2.8];HZ=[.8,1.4];TA=[-1,0,1];G=9.81
def vavg(f=F): return f['muzzleVelocity']*f['velocityRetention']
def rects(h,t,hull_vis=None,tur_vis=(1,1,1),m=M):
    if hull_vis is None: hull_vis=[[1,1],[1,1],[1,1]]
    Wh=m['L']*abs(math.sin(h))+m['B']*abs(math.cos(h));Wt=m['Lt']*abs(math.sin(t))+m['Bt']*abs(math.cos(t))
    out=[];cols=[i for i in range(3) if any(hull_vis[i])];rows=[j for j in range(2) if any(hull_vis[i][j] for i in range(3))]
    if cols:
        c=sum(HA[i]*math.sin(h) for i in cols)/len(cols);fw=len(cols)/3;bands={0:(m['zb'],1.1),1:(1.1,m['zh'])}
        out.append(('hull',c-Wh*fw/2,c+Wh*fw/2,min(bands[j][0] for j in rows),max(bands[j][1] for j in rows)))
    tv=[k for k in range(3) if tur_vis[k]]
    if tv:
        off=m['pivot'][0]*math.sin(h)+m['pivot'][1]*math.cos(h);c=off+sum(TA[k]*math.sin(t) for k in tv)/len(tv);fw=len(tv)/3
        out.append(('turret',c-Wt*fw/2,c+Wt*fw/2,m['zh'],m['zt']))
    return out
def centroid(rs):
    A=sum((r[2]-r[1])*(r[4]-r[3]) for r in rs)
    return (sum((r[1]+r[2])/2*(r[2]-r[1])*(r[4]-r[3]) for r in rs)/A, sum((r[3]+r[4])/2*(r[2]-r[1])*(r[4]-r[3]) for r in rs)/A)
def fire_sigma(R,lay=1.2,vcross=0,own=0,f=F):
    tof=R/vavg(f);disp=f['dispersionMrad'];l=f['layMinMrad']+(f['layStartMrad']-f['layMinMrad'])*math.exp(-lay/f['layTauSeconds'])
    rng=1000*G*f['rangeErrorM']/(2*f['muzzleVelocity']**2);lead=1000*f['leadResidual']*abs(vcross)*tof/R;o=f['stabMradPerMps']*abs(own)
    return dict(tof=tof,disp=disp,lay=l,rng=rng,lead=lead,own=o,x=math.sqrt(disp**2+l**2+lead**2+o**2),z=math.sqrt(disp**2+l**2+rng**2+o**2))
def prob(rs,mu,Sx,Sz):
    out={}
    for r in rs: out[r[0]]=(Phi((r[2]-mu[0])/Sx)-Phi((r[1]-mu[0])/Sx))*(Phi((r[4]-mu[1])/Sz)-Phi((r[3]-mu[1])/Sz))
    return out
def case(R,aspect=0,lay=1.2,vcross=0,own=0,hull_vis=None,bias_x=0,dR=0,impact_aspect=None):
    h=math.radians(aspect);s=fire_sigma(R,lay,vcross,own)
    rf=rects(h,h,hull_vis);aim=centroid(rf)
    hi=math.radians(aspect if impact_aspect is None else impact_aspect);ri=rects(hi,hi,hull_vis)
    R1=R+dR;dz=-G*R1*dR/(2*vavg()**2)
    mu=(aim[0]-bias_x,aim[1]+dz);Sx=s['x']/1000*R1;Sz=s['z']/1000*R1
    p=prob(ri,mu,Sx,Sz);hit=sum(p.values())
    return dict(hit=round(hit,4),hull=round(p.get('hull',0),4),turret=round(p.get('turret',0),4),sigmaX=round(s['x'],4),sigmaZ=round(s['z'],4),tof=round(s['tof'],4))
out={'preview':[],'impact':[],'zones':[],'drop':[]}
HD=[[0,0],[0,0],[0,0]];HALF=[[0,1],[0,1],[0,1]]
for R in [500,1000,1500,2000]:
    for name,kw in [('정면·완전노출·정지',{}),('정면·차체 상단만',{'hull_vis':HALF}),('정면·포탑만',{'hull_vis':HD}),('측면·횡단 10m/s',{'aspect':90,'vcross':10}),('정면·자차 10m/s',{'own':10}),('정면·조준 3s',{'lay':3})]:
        out['preview'].append(dict(range=R,case=name,**case(R,**kw)))
tof=2000/vavg()
for name,kw in [('계속 등속 (편차 0)',{}),('발사 직후 정지',{'bias_x':-10*tof}),('발사 직후 1m/s² 가속',{'bias_x':.5*1*tof**2}),('발사 직후 2m/s² 감속',{'bias_x':-.5*2*tof**2}),
                ('정지 표적이 발사 직후 10m/s로 출발(가속 2m/s²)',{'vcross':0,'bias_x':.5*2*tof**2}),('등속 + 시선 방향 20m 멀어짐',{'vcross':10,'dR':20})]:
    kw.setdefault('vcross',10);kw.setdefault('aspect',90)
    r=case(2000,**kw);out['impact'].append(dict(case=name,bias_x=round(kw.get('bias_x',0),4),dR=kw.get('dR',0),**r))
def zones(a_deg,L,W):
    a=math.radians(a_deg);fr=W*max(0,math.cos(a));re=W*max(0,-math.cos(a));sd=L*abs(math.sin(a));t=fr+re+sd
    return dict(front=round(fr/t,4),side=round(sd/t,4),rear=round(re/t,4),sideHand=('right' if math.sin(a)>1e-9 else 'left' if math.sin(a)<-1e-9 else None))
for a in [0,30,45,60,90,135,180,225,315,359,360]:
    out['zones'].append(dict(angle=a,hull=zones(a,M['L'],M['B']),turret=zones(a,M['Lt'],M['Bt'])))
v=vavg()
for R1,s in [(2000,2000),(2000,2500),(2000,3000),(1000,1500),(2000,1000)]:
    out['drop'].append(dict(R1=R1,s=s,offsetFromChord=round(G*s*(R1-s)/(2*v*v),4)))
json.dump(out,open('reference10.json','w'),ensure_ascii=False,indent=1)
if __name__=='__main__':
    for k in out:
        print('==',k)
        for r in out[k]: print(r)
