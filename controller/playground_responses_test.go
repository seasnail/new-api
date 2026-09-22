package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlaygroundResponsesUsesResponsesValidation(t *testing.T) {
	previousDB, previousLogDB, previousRedis := model.DB, model.LOG_DB, common.RedisEnabled
	t.Cleanup(func() { model.DB, model.LOG_DB, common.RedisEnabled = previousDB, previousLogDB, previousRedis })
	db := setupModelListControllerTestDB(t)
	user := model.User{Username: "responses-playground", Group: "default", Status: common.UserStatusEnabled}
	require.NoError(t, db.Create(&user).Error)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/pg/responses", strings.NewReader(`{"model":"gpt-test","input":"draw a robot","max_output_tokens":18446744073709551615}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("id", user.Id)
	Playground(c)
	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "max_output_tokens is invalid")
}
