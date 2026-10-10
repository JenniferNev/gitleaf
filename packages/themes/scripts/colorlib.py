import colorsys
def h2rgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def rgb2h(r,g,b): return '#%02X%02X%02X'%tuple(max(0,min(255,round(c*255))) for c in (r,g,b))
def lin(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lum(h): r,g,b=h2rgb(h); return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b): la,lb=lum(a),lum(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)
def mix(a,b,t):
    A,B=h2rgb(a),h2rgb(b); return rgb2h(*[A[i]*(1-t)+B[i]*t for i in range(3)])
def alpha(h,a): return h.upper()+'%02X'%round(a*255)
def blend(fg_with_alpha,bg):
    a=int(fg_with_alpha[7:9],16)/255; return mix(bg,fg_with_alpha[:7],a)
def adjust_to(h,bg,target,direction):
    r,g,b=h2rgb(h); H,L,S=colorsys.rgb_to_hls(r,g,b); step=0.004*(1 if direction=='lighter' else -1)
    best=h
    for _ in range(300):
        if cr(best,bg)>=target: return best
        L=max(0,min(1,L+step)); best=rgb2h(*colorsys.hls_to_rgb(H,L,S))
    return best
# Machado 2009 CVD matrices (severity 1.0) applied in linear RGB
M={'deuteranopia':[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
   'protanopia':[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
   'tritanopia':[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]]}
def delin(c): c=max(0,min(1,c)); return c*12.92 if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
def cvd(h,kind):
    r,g,b=[lin(c) for c in h2rgb(h)]; m=M[kind]
    return rgb2h(*[delin(m[i][0]*r+m[i][1]*g+m[i][2]*b) for i in range(3)])
def oklab(h):
    r,g,b=[lin(c) for c in h2rgb(h)]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b; m=0.2119034982*r+0.6806995451*g+0.1073969566*b; s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=[x**(1/3) for x in (l,m,s)]
    return (0.2104542553*l+0.7936177850*m-0.0040720468*s, 1.9779984951*l-2.4285922050*m+0.4505937099*s, 0.0259040371*l+0.7827717662*m-0.8086757660*s)
def dE(a,b): A,B=oklab(a),oklab(b); return sum((A[i]-B[i])**2 for i in range(3))**0.5*100
