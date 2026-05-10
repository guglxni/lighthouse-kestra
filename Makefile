.PHONY: graphify validate-yaml

graphify:
	./scripts/graphify_lighthouse.sh

validate-yaml:
	python3 scripts/validate_yaml.py
