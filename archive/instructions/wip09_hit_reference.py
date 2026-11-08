# WIP09 hit-probability reference (game tuning values, not real fire-control data).
# Generates the golden table in TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md section 5.
# Usage: python3 wip09_hit_reference.py  -> writes reference.json and prints rows.
import math,json
def Phi(x): return 0.5*(1+math.erf(x/math.sqrt(2)))
F=dict(dispersionMrad=.25,layStartMrad=1.5,layMinMrad=.10,layTauSeconds=.6,rangeErrorM=5,muzzleVelocity=1650,velocityRetention=.94,
       leadResidual=.10,maneuverAccel=1.0,maneuverReferenceSpeed=5,stabMradPerMps=.03)
M=dict(L=7.9248,B=3.6576,Lt=4.75,Bt=3.28,zb=.4826,zh=1.65,zt=2.3749,pivot=(.66,0))
HA=[-2.8,0,2.8];HZ=[.8,1.4];TA=[-1,0,1]
def calc(R,aspect_deg=0,turret_rel=0,hull_vis=None,tur_vis=(1,1,1),lay=1.2,v_t=0,own=0,f=F,m=M):
    beta=0.0; h=math.radians(aspect_deg)   # LOS along +x from shooter; target heading h relative
    # e_perp for LOS along x is (0,1)
    t=h+math.radians(turret_rel)
    if hull_vis is None: hull_vis=[[1,1],[1,1],[1,1]]
    ah=h-beta; at=t-beta
    Wh=m['L']*abs(math.sin(ah))+m['B']*abs(math.cos(ah)); Wt=m['Lt']*abs(math.sin(at))+m['Bt']*abs(math.cos(at))
    proj=lambda along,ang: along*math.sin(ang)
    cols=[i for i in range(3) if any(hull_vis[i])]; rows=[j for j in range(2) if any(hull_vis[i][j] for i in range(3))]
    rects=[]
    if cols:
        fw=len(cols)/3; c=sum(proj(HA[i],h) for i in cols)/len(cols)
        bands={0:(m['zb'],(HZ[0]+HZ[1])/2),1:((HZ[0]+HZ[1])/2,m['zh'])}
        z1=min(bands[j][0] for j in rows); z2=max(bands[j][1] for j in rows)
        rects.append(('hull',c-Wh*fw/2,c+Wh*fw/2,z1,z2))
    tv=[k for k in range(3) if tur_vis[k]]
    if tv:
        px,py=m['pivot']; off=px*math.sin(h)+py*math.cos(h)
        c=off+sum(proj(TA[k],t) for k in tv)/len(tv); fw=len(tv)/3
        rects.append(('turret',c-Wt*fw/2,c+Wt*fw/2,m['zh'],m['zt']))
    if not rects: return dict(hit=0)
    area=sum((r[2]-r[1])*(r[4]-r[3]) for r in rects)
    mux=sum((r[1]+r[2])/2*(r[2]-r[1])*(r[4]-r[3]) for r in rects)/area
    muz=sum((r[3]+r[4])/2*(r[2]-r[1])*(r[4]-r[3]) for r in rects)/area
    tof=R/(f['muzzleVelocity']*f['velocityRetention'])
    s_disp=f['dispersionMrad'];s_lay=f['layMinMrad']+(f['layStartMrad']-f['layMinMrad'])*math.exp(-lay/f['layTauSeconds'])
    s_rng=1000*9.81*f['rangeErrorM']/(2*f['muzzleVelocity']**2)
    vc=abs(v_t)  # crossing component supplied directly
    s_lead=1000*f['leadResidual']*vc*tof/R
    s_man=1000*0.5*f['maneuverAccel']*tof**2/R*min(1,abs(v_t)/f['maneuverReferenceSpeed'])
    s_own=f['stabMradPerMps']*abs(own)
    sx=math.sqrt(s_disp**2+s_lay**2+s_lead**2+s_man**2+s_own**2); sz=math.sqrt(s_disp**2+s_lay**2+s_rng**2+s_own**2)
    SX=sx/1000*R; SZ=sz/1000*R
    out={}
    for r in rects:
        out[r[0]]=(Phi((r[2]-mux)/SX)-Phi((r[1]-mux)/SX))*(Phi((r[4]-muz)/SZ)-Phi((r[3]-muz)/SZ))
    hit=sum(out.values())
    return dict(hit=round(hit,4),hull=round(out.get('hull',0),4),turret=round(out.get('turret',0),4),sigmaX=round(sx,4),sigmaZ=round(sz,4),tof=round(tof,3))
rows=[]
HD=[[0,0],[0,0],[0,0]]; HALF=[[0,1],[0,1],[0,1]]
for R in [500,1000,1500,2000,3000]:
    for name,kw in [('정면·완전노출·정지',{}),('정면·차체 상단만',{'hull_vis':HALF}),('정면·포탑만(헐다운)',{'hull_vis':HD}),
                    ('측면·횡단 10m/s',{'aspect_deg':90,'v_t':10}),('정면·자차 10m/s 기동',{'own':10}),('정면·조준 0.4s',{'lay':.4}),('정면·조준 3s',{'lay':3})]:
        r=calc(R,**kw);rows.append(dict(range=R,case=name,**r))
json.dump(dict(params=F,model=M,rows=rows),open('reference.json','w'),ensure_ascii=False,indent=1)
for r in rows: print(r['range'],r['case'],r['hit'],r['hull'],r['turret'],r['sigmaX'],r['sigmaZ'])
