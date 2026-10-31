import test from 'node:test';
import assert from 'node:assert/strict';
import {referralFromUrl,storedReferral,referralLink,withoutReferral} from './context.js';
const code='MAF-'+'AB12'.repeat(6);
test('Un lien normal ne fournit aucun code',()=>{assert.deepEqual(referralFromUrl('https://example.test/game/#profil'),{present:false,code:null});});
test('Le code du lien est lu tel quel, sans zone de saisie',()=>{assert.deepEqual(referralFromUrl('https://example.test/?parrainage='+code+'#profil'),{present:true,code});});
test('Les codes invalides ou ambigus ne reprennent pas un ancien parrainage',()=>{
 for(const q of ['parrainage=','parrainage=FAKE','parrainage='+code+'&parrainage='+code])assert.deepEqual(referralFromUrl('https://example.test/?'+q),{present:true,code:null});
});
test('Le parcours garde uniquement un code valide pendant une journee',()=>{
 const now=1700000000000;
 assert.equal(storedReferral(JSON.stringify({code,saved_at:now-1}),now),code);
 for(const value of ['invalid',JSON.stringify({code,saved_at:now+1}),JSON.stringify({code,saved_at:now-86400000}),JSON.stringify({code:'FAKE',saved_at:now})])assert.equal(storedReferral(value,now),null);
});
test('Le lien a copier garde le chemin du site et retire les autres parametres',()=>{
 const url=new URL(referralLink(code,'https://example.test/maf-game/?private=remove#game'));
 assert.equal(url.pathname,'/maf-game/');assert.equal(url.searchParams.get('parrainage'),code);assert.equal(url.searchParams.has('private'),false);assert.equal(url.hash,'#profil');
 assert.throws(()=>referralLink(code,'javascript:alert(1)'));
});
test('Effacer le parrainage conserve les autres parametres et la vue',()=>{
 const url=new URL(withoutReferral('https://example.test/?theme=rose&parrainage='+code+'#studio'));
 assert.equal(url.searchParams.has('parrainage'),false);assert.equal(url.searchParams.get('theme'),'rose');assert.equal(url.hash,'#studio');
});
