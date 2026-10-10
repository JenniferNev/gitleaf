import json, sys
sys.path.insert(0, sys.argv[1]); out=sys.argv[2]
from colorlib import *

P = dict(sky='#4AB3F8', butter='#F7F099', pink='#FC4CBC', violet='#CF3BF7',
         purple='#962DCF', plum='#53235E', ink='#040F16', paper='#F8F8F8', leaf='#5EE6A8')
report = []

def build(kind):
    dark = kind == 'dark'
    ink, paper = P['ink'], P['paper']
    if dark:
        n = {k: mix(ink, paper, t) for k, t in dict(n0=0.0, n1=0.025, n2=0.045, n3=0.08, n4=0.12, n5=0.17, n6=0.26).items()}
        bg = n['n2']; side = n['n1']; deep = n['n0']; raised = n['n3']; hover = n['n4']; border = n['n5']; strong_border = n['n6']
        fg = mix(paper, ink, 0.07); fg_strong = paper
        muted = adjust_to(mix(ink, paper, 0.45), bg, 4.6, 'lighter')
        faint = adjust_to(mix(ink, paper, 0.30), bg, 3.0, 'lighter')
        comment = adjust_to(mix(P['plum'], paper, 0.45), bg, 4.6, 'lighter')
        A = dict(
            keyword=P['pink'], string=P['butter'], number=P['leaf'], func=P['sky'], type=P['violet'],
            prop=mix(P['sky'], paper, 0.45), regex=adjust_to(P['purple'], bg, 4.6, 'lighter'),
            heading=P['butter'], inlinecode=P['butter'], link=P['sky'], listmark=P['pink'],
            added=P['leaf'], modified=P['sky'], deleted=P['pink'], warning=P['butter'], error=P['pink'],
            info=P['sky'], conflict=P['violet'], cursor=P['butter'], accent=P['butter'], focus=P['sky'])
    else:
        bg = '#FFFFFF'; side = paper; deep = mix(paper, ink, 0.035); raised = mix(paper, ink, 0.015)
        hover = mix(paper, ink, 0.05); border = mix(paper, ink, 0.12); strong_border = mix(paper, ink, 0.22)
        fg = mix(ink, paper, 0.06); fg_strong = ink
        muted = adjust_to(mix(paper, ink, 0.5), deep, 4.6, 'darker')
        faint = adjust_to(mix(paper, ink, 0.35), bg, 3.0, 'darker')
        comment = adjust_to(mix(P['plum'], paper, 0.35), bg, 4.6, 'darker')
        dk = lambda c, t=4.6: adjust_to(c, bg, t, 'darker')
        A = dict(
            keyword=dk(P['pink']), string=dk(P['butter']), number=dk(P['leaf']), func=dk(P['sky']), type=dk(P['violet']),
            prop=P['plum'], regex=dk(P['purple']),
            heading=P['plum'], inlinecode=dk(P['butter']), link=dk(P['sky']), listmark=dk(P['pink']),
            added=dk(P['leaf'], 3.0), modified=dk(P['sky'], 3.0), deleted=dk(P['pink'], 3.0), warning=dk(P['butter'], 3.0),
            error=dk(P['pink']), info=dk(P['sky']), conflict=dk(P['violet'], 3.0), cursor=dk(P['pink']), accent=P['butter'], focus=dk(P['sky'], 3.0))

    btn_bg, btn_fg = (P['butter'], ink) if dark else (ink, P['butter'])
    btn_hover = mix(P['butter'], paper, 0.35) if dark else mix(ink, P['plum'], 0.5)
    sel = alpha(P['violet'], 0.30 if dark else 0.18)
    c = {
        # base
        'foreground': fg, 'descriptionForeground': muted, 'disabledForeground': faint, 'errorForeground': A['error'],
        'focusBorder': A['focus'], 'contrastBorder': '#00000000', 'widget.border': border, 'widget.shadow': alpha('#000000', 0.45 if dark else 0.12),
        'selection.background': sel, 'icon.foreground': mix(fg, bg, 0.15), 'sash.hoverBorder': A['focus'],
        'textLink.foreground': A['link'], 'textLink.activeForeground': A['link'], 'textCodeBlock.background': raised,
        'textBlockQuote.background': raised, 'textBlockQuote.border': P['plum'] if dark else P['violet'], 'textPreformat.foreground': A['inlinecode'],
        'textSeparator.foreground': border,
        # buttons, badges, inputs
        'button.background': btn_bg, 'button.foreground': btn_fg, 'button.hoverBackground': btn_hover, 'button.border': '#00000000',
        'button.secondaryBackground': raised, 'button.secondaryForeground': fg, 'button.secondaryHoverBackground': hover,
        'badge.background': P['pink'] if dark else A['keyword'], 'badge.foreground': ink if dark else '#FFFFFF',
        'activityBarBadge.background': P['pink'] if dark else A['keyword'], 'activityBarBadge.foreground': ink if dark else '#FFFFFF',
        'input.background': raised if dark else '#FFFFFF', 'input.foreground': fg, 'input.border': border, 'input.placeholderForeground': muted,
        'inputOption.activeBorder': A['focus'], 'inputOption.activeBackground': alpha(A['focus'], 0.2), 'inputOption.activeForeground': fg_strong,
        'inputValidation.errorBorder': A['error'], 'inputValidation.errorBackground': raised, 'inputValidation.warningBorder': A['warning'],
        'inputValidation.warningBackground': raised, 'inputValidation.infoBorder': A['info'], 'inputValidation.infoBackground': raised,
        'dropdown.background': raised if dark else '#FFFFFF', 'dropdown.border': border, 'dropdown.foreground': fg, 'dropdown.listBackground': raised if dark else '#FFFFFF',
        'checkbox.background': raised if dark else '#FFFFFF', 'checkbox.border': strong_border, 'checkbox.foreground': fg,
        'progressBar.background': A['accent'] if dark else A['keyword'], 'keybindingLabel.foreground': fg, 'keybindingLabel.background': raised,
        'keybindingLabel.border': border, 'keybindingLabel.bottomBorder': strong_border,
        # lists & trees
        'list.activeSelectionBackground': P['plum'] if dark else mix('#FFFFFF', P['violet'], 0.14),
        'list.activeSelectionForeground': paper if dark else ink, 'list.activeSelectionIconForeground': paper if dark else ink,
        'list.inactiveSelectionBackground': hover, 'list.inactiveSelectionForeground': fg,
        'list.hoverBackground': hover, 'list.hoverForeground': fg_strong, 'list.focusOutline': A['focus'], 'list.focusAndSelectionOutline': A['focus'],
        'list.highlightForeground': P['butter'] if dark else A['keyword'], 'list.focusHighlightForeground': P['butter'] if dark else A['keyword'],
        'list.dropBackground': alpha(A['focus'], 0.18), 'list.errorForeground': A['error'], 'list.warningForeground': A['warning'],
        'list.invalidItemForeground': A['error'], 'tree.indentGuidesStroke': border, 'tree.inactiveIndentGuidesStroke': mix(border, bg, 0.5),
        'quickInput.background': raised, 'quickInput.foreground': fg, 'quickInputList.focusBackground': P['plum'] if dark else mix('#FFFFFF', P['violet'], 0.14),
        'quickInputList.focusForeground': paper if dark else ink, 'quickInputTitle.background': hover, 'pickerGroup.foreground': A['type'], 'pickerGroup.border': border,
        # activity bar, side bar, title, status, panel, tabs
        'activityBar.background': deep, 'activityBar.foreground': fg_strong, 'activityBar.inactiveForeground': muted,
        'activityBar.activeBorder': A['accent'] if dark else A['keyword'], 'activityBar.border': border,
        'sideBar.background': side, 'sideBar.foreground': fg, 'sideBar.border': border, 'sideBarTitle.foreground': fg_strong,
        'sideBarSectionHeader.background': side, 'sideBarSectionHeader.foreground': fg_strong, 'sideBarSectionHeader.border': border,
        'titleBar.activeBackground': deep, 'titleBar.activeForeground': fg, 'titleBar.inactiveBackground': deep, 'titleBar.inactiveForeground': muted, 'titleBar.border': border,
        'commandCenter.background': raised, 'commandCenter.border': border, 'commandCenter.foreground': fg,
        'statusBar.background': P['plum'], 'statusBar.foreground': paper, 'statusBar.border': P['plum'],
        'statusBar.noFolderBackground': deep if dark else mix(P['plum'], ink, 0.3), 'statusBar.noFolderForeground': paper,
        'statusBar.debuggingBackground': P['pink'], 'statusBar.debuggingForeground': ink,
        'statusBarItem.hoverBackground': mix(P['plum'], paper, 0.15), 'statusBarItem.remoteBackground': P['butter'], 'statusBarItem.remoteForeground': ink,
        'statusBarItem.prominentBackground': mix(P['plum'], ink, 0.3), 'statusBarItem.errorBackground': P['pink'], 'statusBarItem.errorForeground': ink,
        'statusBarItem.warningBackground': P['butter'], 'statusBarItem.warningForeground': ink,
        'panel.background': side, 'panel.border': border, 'panelTitle.activeForeground': fg_strong, 'panelTitle.inactiveForeground': muted,
        'panelTitle.activeBorder': A['accent'] if dark else A['keyword'],
        'editorGroupHeader.tabsBackground': side, 'editorGroupHeader.tabsBorder': border, 'editorGroup.border': border,
        'editorGroup.dropBackground': alpha(A['focus'], 0.15),
        'tab.activeBackground': bg, 'tab.activeForeground': fg_strong, 'tab.activeBorderTop': A['accent'] if dark else A['keyword'], 'tab.activeBorder': bg,
        'tab.inactiveBackground': side, 'tab.inactiveForeground': muted, 'tab.border': border, 'tab.hoverBackground': hover,
        'tab.unfocusedActiveForeground': fg, 'tab.unfocusedActiveBorderTop': border, 'tab.activeModifiedBorder': A['modified'],
        'breadcrumb.foreground': muted, 'breadcrumb.focusForeground': fg_strong, 'breadcrumb.activeSelectionForeground': fg_strong, 'breadcrumbPicker.background': raised,
        # editor
        'editor.background': bg, 'editor.foreground': fg, 'editorCursor.foreground': A['cursor'],
        'editor.lineHighlightBackground': mix(bg, fg, 0.04 if dark else 0.035), 'editor.lineHighlightBorder': '#00000000',
        'editorLineNumber.foreground': faint, 'editorLineNumber.activeForeground': A['accent'] if dark else ink,
        'editor.selectionBackground': sel, 'editor.inactiveSelectionBackground': alpha(P['violet'], 0.15 if dark else 0.09),
        'editor.selectionHighlightBackground': alpha(P['sky'], 0.18 if dark else 0.14), 'editor.wordHighlightBackground': alpha(P['sky'], 0.18 if dark else 0.12),
        'editor.wordHighlightStrongBackground': alpha(P['pink'], 0.20 if dark else 0.12),
        'editor.findMatchBackground': alpha(P['butter'], 0.45 if dark else 0.85), 'editor.findMatchBorder': P['butter'] if dark else A['warning'],
        'editor.findMatchHighlightBackground': alpha(P['butter'], 0.20 if dark else 0.45), 'editor.findRangeHighlightBackground': alpha(P['sky'], 0.08),
        'editor.hoverHighlightBackground': alpha(P['sky'], 0.12), 'editor.rangeHighlightBackground': alpha(P['sky'], 0.08),
        'editorLink.activeForeground': A['link'], 'editorWhitespace.foreground': mix(bg, fg, 0.18), 'editorIndentGuide.background1': mix(bg, fg, 0.10),
        'editorIndentGuide.activeBackground1': mix(bg, fg, 0.30), 'editorRuler.foreground': mix(bg, fg, 0.10),
        'editorBracketMatch.background': alpha(P['sky'], 0.15), 'editorBracketMatch.border': A['focus'],
        'editorBracketHighlight.foreground1': A['func'], 'editorBracketHighlight.foreground2': A['keyword'], 'editorBracketHighlight.foreground3': A['string'],
        'editorBracketHighlight.foreground4': A['type'], 'editorBracketHighlight.foreground5': A['number'], 'editorBracketHighlight.foreground6': A['prop'],
        'editorBracketHighlight.unexpectedBracket.foreground': A['error'],
        'editorWidget.background': raised, 'editorWidget.foreground': fg, 'editorWidget.border': border, 'editorSuggestWidget.background': raised,
        'editorSuggestWidget.border': border, 'editorSuggestWidget.selectedBackground': P['plum'] if dark else mix('#FFFFFF', P['violet'], 0.14),
        'editorSuggestWidget.selectedForeground': paper if dark else ink, 'editorSuggestWidget.highlightForeground': P['butter'] if dark else A['keyword'],
        'editorHoverWidget.background': raised, 'editorHoverWidget.border': border,
        'editorError.foreground': A['error'], 'editorWarning.foreground': A['warning'], 'editorInfo.foreground': A['info'], 'editorHint.foreground': A['number'],
        'editorGutter.addedBackground': A['added'], 'editorGutter.modifiedBackground': A['modified'], 'editorGutter.deletedBackground': A['deleted'],
        'editorOverviewRuler.border': '#00000000', 'editorOverviewRuler.addedForeground': alpha(A['added'], 0.7), 'editorOverviewRuler.modifiedForeground': alpha(A['modified'], 0.7),
        'editorOverviewRuler.deletedForeground': alpha(A['deleted'], 0.7), 'editorOverviewRuler.errorForeground': A['error'], 'editorOverviewRuler.warningForeground': A['warning'],
        'editorOverviewRuler.findMatchForeground': alpha(P['butter'], 0.8),
        'editorInlayHint.foreground': muted, 'editorInlayHint.background': alpha(raised, 0.8) if False else raised,
        'editorCodeLens.foreground': muted, 'editorGhostText.foreground': faint,
        'editorStickyScroll.background': side, 'editorStickyScrollHover.background': hover,
        # diff & merge
        'diffEditor.insertedTextBackground': alpha(A['added'], 0.16 if dark else 0.20), 'diffEditor.removedTextBackground': alpha(A['deleted'], 0.18 if dark else 0.16),
        'diffEditor.insertedLineBackground': alpha(A['added'], 0.08 if dark else 0.10), 'diffEditor.removedLineBackground': alpha(A['deleted'], 0.09 if dark else 0.08),
        'diffEditor.diagonalFill': mix(bg, fg, 0.12), 'diffEditorGutter.insertedLineBackground': alpha(A['added'], 0.2), 'diffEditorGutter.removedLineBackground': alpha(A['deleted'], 0.2),
        'merge.currentHeaderBackground': alpha(A['added'], 0.35), 'merge.currentContentBackground': alpha(A['added'], 0.12),
        'merge.incomingHeaderBackground': alpha(A['modified'], 0.35), 'merge.incomingContentBackground': alpha(A['modified'], 0.12),
        'mergeEditor.change.background': alpha(A['modified'], 0.15), 'mergeEditor.change.word.background': alpha(A['modified'], 0.30),
        'mergeEditor.conflict.unhandledUnfocused.border': A['warning'], 'mergeEditor.conflict.unhandledFocused.border': A['accent'] if dark else A['keyword'],
        'mergeEditor.conflict.handledUnfocused.border': alpha(A['added'], 0.6), 'mergeEditor.conflict.handledFocused.border': A['added'],
        # git & scm
        'gitDecoration.addedResourceForeground': A['added'], 'gitDecoration.untrackedResourceForeground': A['added'],
        'gitDecoration.modifiedResourceForeground': A['modified'], 'gitDecoration.stageModifiedResourceForeground': A['modified'],
        'gitDecoration.deletedResourceForeground': A['deleted'], 'gitDecoration.stageDeletedResourceForeground': A['deleted'],
        'gitDecoration.renamedResourceForeground': A['type'], 'gitDecoration.conflictingResourceForeground': A['conflict'],
        'gitDecoration.ignoredResourceForeground': faint, 'gitDecoration.submoduleResourceForeground': A['prop'],
        'scmGraph.historyItemRefColor': A['func'], 'scmGraph.historyItemRemoteRefColor': A['type'], 'scmGraph.historyItemBaseRefColor': A['string'],
        'scmGraph.foreground1': A['func'], 'scmGraph.foreground2': A['keyword'], 'scmGraph.foreground3': A['number'], 'scmGraph.foreground4': A['type'], 'scmGraph.foreground5': A['string'],
        # notifications, menus, misc
        'notifications.background': raised, 'notifications.foreground': fg, 'notifications.border': border, 'notificationCenterHeader.background': hover,
        'notificationsErrorIcon.foreground': A['error'], 'notificationsWarningIcon.foreground': A['warning'], 'notificationsInfoIcon.foreground': A['info'],
        'menu.background': raised, 'menu.foreground': fg, 'menu.selectionBackground': P['plum'] if dark else mix('#FFFFFF', P['violet'], 0.14),
        'menu.selectionForeground': paper if dark else ink, 'menu.separatorBackground': border, 'menu.border': border,
        'scrollbar.shadow': alpha('#000000', 0.4 if dark else 0.08), 'scrollbarSlider.background': alpha(mix(bg, fg, 0.5), 0.25),
        'scrollbarSlider.hoverBackground': alpha(mix(bg, fg, 0.5), 0.4), 'scrollbarSlider.activeBackground': alpha(mix(bg, fg, 0.5), 0.55),
        'minimap.findMatchHighlight': alpha(P['butter'], 0.6), 'minimap.selectionHighlight': alpha(P['violet'], 0.5),
        'peekView.border': A['type'], 'peekViewEditor.background': side, 'peekViewResult.background': raised, 'peekViewTitle.background': hover,
        'peekViewEditor.matchHighlightBackground': alpha(P['butter'], 0.3), 'peekViewResult.matchHighlightBackground': alpha(P['butter'], 0.3),
        'welcomePage.tileBackground': raised, 'walkThrough.embeddedEditorBackground': side,
        'chat.requestBackground': raised, 'chat.slashCommandForeground': A['type'],
        'testing.iconPassed': A['added'], 'testing.iconFailed': A['error'], 'testing.iconQueued': A['warning'],
        'charts.foreground': fg, 'charts.lines': border, 'charts.blue': A['func'], 'charts.red': A['error'], 'charts.yellow': A['warning'],
        'charts.orange': A['keyword'], 'charts.green': A['added'], 'charts.purple': A['type'],
        # terminal
        'terminal.background': bg, 'terminal.foreground': fg, 'terminalCursor.foreground': A['cursor'], 'terminal.selectionBackground': sel,
        'terminal.ansiBlack': ink if dark else mix(ink, paper, 0.2), 'terminal.ansiBrightBlack': faint,
        'terminal.ansiRed': A['error'], 'terminal.ansiBrightRed': mix(P['pink'], paper, 0.3) if dark else dk(P['pink'], 3.5),
        'terminal.ansiGreen': A['number'], 'terminal.ansiBrightGreen': mix(P['leaf'], paper, 0.3) if dark else dk(P['leaf'], 3.5),
        'terminal.ansiYellow': A['string'], 'terminal.ansiBrightYellow': mix(P['butter'], paper, 0.3) if dark else dk(P['butter'], 3.5),
        'terminal.ansiBlue': A['func'], 'terminal.ansiBrightBlue': mix(P['sky'], paper, 0.3) if dark else dk(P['sky'], 3.5),
        'terminal.ansiMagenta': A['type'], 'terminal.ansiBrightMagenta': mix(P['violet'], paper, 0.3) if dark else dk(P['violet'], 3.5),
        'terminal.ansiCyan': A['prop'] if dark else dk('#2FB8C9'), 'terminal.ansiBrightCyan': mix(P['sky'], paper, 0.6) if dark else dk('#2FB8C9', 3.5),
        'terminal.ansiWhite': fg if dark else muted, 'terminal.ansiBrightWhite': paper if dark else fg,
    }
    if not dark:
        # text-safe (>=4.5:1) variants where git/list colors render as text labels
        for key, base in (('gitDecoration.addedResourceForeground', P['leaf']), ('gitDecoration.untrackedResourceForeground', P['leaf']),
                          ('gitDecoration.modifiedResourceForeground', P['sky']), ('gitDecoration.stageModifiedResourceForeground', P['sky']),
                          ('gitDecoration.deletedResourceForeground', P['pink']), ('gitDecoration.stageDeletedResourceForeground', P['pink']),
                          ('gitDecoration.conflictingResourceForeground', P['violet']), ('list.warningForeground', P['butter'])):
            c[key] = adjust_to(base, side, 4.6, 'darker')
        c['gitDecoration.ignoredResourceForeground'] = muted
    colors = c
    tok = lambda scope, fgc, style=None: {'scope': scope, 'settings': dict({'foreground': fgc}, **({'fontStyle': style} if style else {}))}
    tokens = [
        tok(['comment', 'punctuation.definition.comment'], comment, 'italic'),
        tok(['keyword', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.operator.new', 'keyword.operator.expression', 'keyword.other.important'], A['keyword']),
        tok(['keyword.operator', 'punctuation', 'meta.brace', 'punctuation.separator', 'punctuation.terminator'], muted),
        tok(['string', 'punctuation.definition.string', 'string.template'], A['string']),
        tok(['constant.numeric', 'constant.language', 'constant.other', 'support.constant', 'constant.language.boolean', 'constant.language.null'], A['number']),
        tok(['constant.character.escape', 'string.regexp', 'constant.other.character-class.regexp'], A['regex']),
        tok(['entity.name.function', 'support.function', 'meta.function-call entity.name.function', 'variable.function'], A['func']),
        tok(['entity.name.type', 'entity.name.class', 'support.class', 'support.type', 'entity.other.inherited-class', 'entity.name.namespace', 'storage.type.class'], A['type']),
        tok(['variable', 'meta.definition.variable', 'variable.other.readwrite'], fg),
        tok(['variable.parameter', 'meta.parameter'], fg, 'italic'),
        tok(['variable.language', 'variable.language.this', 'variable.language.self'], A['keyword'], 'italic'),
        tok(['variable.other.property', 'support.variable.property', 'meta.object-literal.key', 'entity.name.tag.yaml', 'support.type.property-name', 'support.type.property-name.json'], A['prop']),
        tok(['entity.name.tag', 'meta.tag.sgml', 'punctuation.definition.tag'], A['keyword']),
        tok(['entity.other.attribute-name'], A['type'], 'italic'),
        tok(['meta.decorator', 'punctuation.decorator', 'entity.name.function.decorator', 'storage.type.annotation'], A['string'], 'italic'),
        tok(['markup.heading', 'markup.heading entity.name', 'entity.name.section.markdown'], A['heading'], 'bold'),
        tok(['punctuation.definition.heading.markdown'], A['listmark']),
        tok(['markup.bold', 'punctuation.definition.bold'], fg_strong, 'bold'),
        tok(['markup.italic', 'punctuation.definition.italic'], fg_strong, 'italic'),
        tok(['markup.strikethrough'], muted, 'strikethrough'),
        tok(['markup.underline.link', 'string.other.link', 'markup.link'], A['link']),
        tok(['markup.underline.link.markdown', 'meta.link.inline.markdown markup.underline.link'], muted, 'underline'),
        tok(['markup.inline.raw', 'markup.fenced_code.block', 'markup.raw'], A['inlinecode']),
        tok(['markup.quote', 'punctuation.definition.quote.begin.markdown'], comment, 'italic'),
        tok(['punctuation.definition.list.begin.markdown', 'beginning.punctuation.definition.list.markdown', 'markup.list.numbered punctuation'], A['listmark']),
        tok(['meta.separator.markdown', 'markup.heading.setext'], muted),
        tok(['markup.inserted', 'meta.diff.header.to-file', 'punctuation.definition.inserted'], A['added']),
        tok(['markup.deleted', 'meta.diff.header.from-file', 'punctuation.definition.deleted'], A['deleted']),
        tok(['markup.changed', 'punctuation.definition.changed'], A['modified']),
        tok(['meta.diff.range', 'meta.diff.header'], A['type']),
        tok(['invalid', 'invalid.illegal'], A['error'], 'underline'),
        tok(['invalid.deprecated'], A['warning'], 'strikethrough'),
    ]
    semantic = {
        'function': A['func'], 'method': A['func'], 'class': A['type'], 'interface': A['type'], 'enum': A['type'], 'type': A['type'],
        'typeParameter': A['type'], 'namespace': A['type'], 'parameter': {'foreground': fg, 'italic': True}, 'property': A['prop'],
        'enumMember': A['number'], 'variable.readonly': A['number'], 'variable.defaultLibrary': A['func'], 'decorator': A['string'],
        'keyword': A['keyword'], 'string': A['string'], 'number': A['number'], 'regexp': A['regex'], 'comment': {'foreground': comment, 'italic': True},
    }
    name = 'Gitleaf Ink' if dark else 'Gitleaf Paper'
    theme = {'$schema': 'vscode://schemas/color-theme', 'name': name, 'type': kind, 'semanticHighlighting': True,
             'colors': colors, 'tokenColors': tokens, 'semanticTokenColors': semantic}
    # contrast report
    checks = {'fg': fg, 'comment': comment, 'muted (descriptions)': muted, **{k: A[k] for k in ('keyword','string','number','func','type','prop','regex','heading','inlinecode','link','listmark','error')}}
    for k, v in checks.items():
        report.append((name, k, v, round(cr(v, bg), 2), 4.5))
    for k in ('added','modified','deleted','warning','conflict','focus'):
        report.append((name, k + ' (graphic)', A[k], round(cr(A[k], bg), 2), 3.0))
    report.append((name, 'line numbers (graphic)', faint, round(cr(faint, bg), 2), 3.0))
    report.append((name, 'status bar text on plum', paper, round(cr(paper, P['plum']), 2), 4.5))
    report.append((name, 'button text', btn_fg, round(cr(btn_fg, btn_bg), 2), 4.5))
    report.append((name, 'selected list text', colors['list.activeSelectionForeground'], round(cr(colors['list.activeSelectionForeground'], colors['list.activeSelectionBackground']), 2), 4.5))
    report.append((name, 'text over selection', fg, round(cr(fg, blend(sel, bg)), 2), 4.5))
    report.append((name, 'string over find match', A['string'], round(cr(A['string'], blend(colors['editor.findMatchBackground'], bg)), 2), 3.0))
    for key in ('gitDecoration.addedResourceForeground','gitDecoration.modifiedResourceForeground','gitDecoration.deletedResourceForeground','gitDecoration.conflictingResourceForeground','gitDecoration.ignoredResourceForeground'):
        report.append((name, key.split('.')[1][:22]+' (text)', colors[key], round(cr(colors[key], side), 2), 4.5 if key!='gitDecoration.ignoredResourceForeground' else 3.0))
    report.append((name, 'tab inactive text', colors['tab.inactiveForeground'], round(cr(colors['tab.inactiveForeground'], side), 2), 4.5))
    report.append((name, 'activity inactive icon', colors['activityBar.inactiveForeground'], round(cr(colors['activityBar.inactiveForeground'], deep), 2), 3.0))
    return name, theme

def dk(c, t=4.6): return adjust_to(c, '#FFFFFF', t, 'darker')
for kind, fname in (('dark', 'gitleaf-ink-color-theme.json'), ('light', 'gitleaf-paper-color-theme.json')):
    name, th = build(kind)
    json.dump(th, open(f'{out}/{fname}', 'w'), indent=2)
fails = [r for r in report if r[3] < r[4]]
for r in report: print(f"{r[0]:14} {r[1]:28} {r[2]}  {r[3]:5}  {'OK' if r[3]>=r[4] else 'FAIL (<'+str(r[4])+')'}")
print('FAILS:', len(fails))
