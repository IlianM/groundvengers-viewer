import json, struct
# cube unité centré, 24 sommets
faces=[((1,0,0),[(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)]),((-1,0,0),[(-1,-1,1),(-1,1,1),(-1,1,-1),(-1,-1,-1)]),
 ((0,1,0),[(-1,1,-1),(-1,1,1),(1,1,1),(1,1,-1)]),((0,-1,0),[(-1,-1,1),(-1,-1,-1),(1,-1,-1),(1,-1,1)]),
 ((0,0,1),[(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]),((0,0,-1),[(1,-1,-1),(-1,-1,-1),(-1,1,-1),(1,1,-1)])]
pos=[];nor=[];idx=[]
for n,vs in faces:
    b=len(pos)
    for v in vs: pos.append([c*0.5 for c in v]); nor.append(list(n))
    idx+= [b,b+1,b+2,b,b+2,b+3]
P=b''.join(struct.pack('<3f',*p) for p in pos); N=b''.join(struct.pack('<3f',*n) for n in nor); I=b''.join(struct.pack('<H',i) for i in idx)
buf=P+N+I
def noeud(nom,t,s,mat): return {"name":nom,"mesh":0,"translation":t,"scale":s,"extras":{}}
nodes=[
 {"name":"NIV-R0","mesh":0,"translation":[15,-0.15,9],"scale":[30,0.3,18]},
 {"name":"Mur_nord","mesh":0,"translation":[15,1.75,0.1],"scale":[30,3.5,0.2]},
 {"name":"mont-01.001","mesh":0,"translation":[15,4,9],"scale":[3,3,3]},
]
gltf={"asset":{"version":"2.0"},"scene":0,"scenes":[{"nodes":list(range(len(nodes)))}],"nodes":nodes,
 "meshes":[{"primitives":[{"attributes":{"POSITION":0,"NORMAL":1},"indices":2,"material":0}]}],
 "materials":[{"pbrMetallicRoughness":{"baseColorFactor":[0.85,0.55,0.25,1],"metallicFactor":0,"roughnessFactor":0.9}}],
 "buffers":[{"byteLength":len(buf)}],
 "bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":len(P)},{"buffer":0,"byteOffset":len(P),"byteLength":len(N)},{"buffer":0,"byteOffset":len(P)+len(N),"byteLength":len(I)}],
 "accessors":[{"bufferView":0,"componentType":5126,"count":24,"type":"VEC3","min":[-.5]*3,"max":[.5]*3},{"bufferView":1,"componentType":5126,"count":24,"type":"VEC3"},{"bufferView":2,"componentType":5123,"count":36,"type":"SCALAR"}]}
j=json.dumps(gltf).encode(); j+=b' '*((4-len(j)%4)%4); buf+=b'\0'*((4-len(buf)%4)%4)
out=struct.pack('<III',0x46546C67,2,12+8+len(j)+8+len(buf))+struct.pack('<II',len(j),0x4E4F534A)+j+struct.pack('<II',len(buf),0x004E4942)+buf
open('test-batiment.glb','wb').write(out); print(len(out),'octets')
