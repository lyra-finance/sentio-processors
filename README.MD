### New Integrations


1. Copy paste existing integration
2. cd into new vault
3. rename project name in `package.json` and `sentio.yaml`
4. delete all `node_modules, package-lock.json, yarn.lock`
5. `yarn install`
6. `yarn sentio build` and `yarn sentio gen`
7. modify `config.ts`


### Uploading to sentio
- `npx @sentio/cli login --api-key <api-key>` (create API key in sentio dashboard)
- `yarn sentio upload`