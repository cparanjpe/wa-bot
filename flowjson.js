const template = { "version": "3.1", "screens": [{ "id": "RECOMMEND", "title": "Complete your Profile", "data": {}, "terminal": true, "layout": { "type": "SingleColumnLayout", "children": [{ "type": "Form", "name": "flow_path", "children": [{ "type": "TextInput", "label": "Enter Your Name", "name": "TextInput_bd11de", "required": true, "input-type": "text" }, { "type": "TextInput", "label": "Email", "name": "TextInput_f9de86", "required": true, "input-type": "email" }, { "type": "TextInput", "label": "Age", "name": "TextInput_08ef94", "required": true, "input-type": "number" }, { "type": "TextArea", "label": "Diet Preferences & Allergies.", "required": true, "name": "TextArea_cf433a", "helper-text": "Describe your diet preferences,likes and dislikes in food and allergies if any" }, { "type": "TextArea", "label": "Your Fitness Goals", "required": true, "name": "TextArea_ad688b", "helper-text": "Describe what would you like to be" }, { "type": "Footer", "label": "Continue", "on-click-action": { "name": "complete", "payload": { "screen_0_TextInput_0": "${form.TextInput_bd11de}", "screen_0_TextInput_1": "${form.TextInput_f9de86}", "screen_0_TextInput_2": "${form.TextInput_08ef94}", "screen_0_TextArea_3": "${form.TextArea_cf433a}", "screen_0_TextArea_4": "${form.TextArea_ad688b}" } } }] }] } }] }