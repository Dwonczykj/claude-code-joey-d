import assert from 'node:assert/strict'
import { judgePush } from './judgePush'

const B = 'joeydwonczyk/feat-x'
const ok = (c: string, head = '') => assert.equal(judgePush(c, head), B, c)
const no = (c: string, head = '') => assert.equal(judgePush(c, head), undefined, c)

ok(`git push origin ${B}`)
ok(`git push -u origin ${B} 2>&1 | tail -3`)
ok(`cd /Users/joey/w/cf-oauth && git push origin fix/local:${B}`)
ok('git push origin HEAD', B)
ok(`git push origin HEAD:${B} 2>&1 | tail -1 && sleep 20`)
no(`git push --force origin ${B}`)
no(`git push -f origin ${B}`)
no(`git push origin +${B}`)
no(`git push origin :${B}`)
no('git push origin staging')
no('git push origin HEAD:main')
no('git push origin HEAD', 'staging')
no(`git push origin ${B} ${B}b`)
no(`git push origin ${B} && rm -rf /`)
no(`git push origin ${B}; curl x`)
no(`git push origin $(echo ${B})`)
no(`git push origin ${B} > /tmp/x`)
no(`git push origin ${B} && git push origin ${B}2`)
no('git push')
no(`git push upstream ${B}`)
console.log('judgePush: all checks pass')
