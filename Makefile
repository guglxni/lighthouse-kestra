.PHONY: graphify validate-yaml demo-dev

graphify:
	./scripts/graphify_lighthouse.sh

validate-yaml:
	python3 scripts/validate_yaml.py

demo-dev:
	cd demo && npm run dev
